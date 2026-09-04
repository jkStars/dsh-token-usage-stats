/**
 * Cross-session token usage, request count, and optional cost analytics, with
 * a self-contained web dashboard served from the same plugin.
 *
 * @module dsh-token-usage-stats
 */

import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { deepFreeze } from '@deepseek-ai/dsh-util-values'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import type { Session, SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-session-title'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { zstdDecompress } from 'node:zlib'
import os from 'node:os'
import path from 'node:path'
import { renderUsageDashboard } from './dashboard.ts'
import { parseTokenUsageStatsQuery } from './routes.ts'
import type {
  ModelPricing,
  ModelPriceTier,
  ModelUsage,
  PeakInterval,
  PricingConfigPayload,
  SessionUsage,
  TokenUsageStatsConfig,
  TokenUsageStatsQuery,
  TokenUsageStatsSnapshot,
  UsageSeriesPoint,
  UsageTotals,
} from './types.ts'

export type * from './types.ts'

/** One provider-reported usage sample retained for one session step. */
interface UsageRecord {
  readonly sessionId: SessionId
  readonly time: number
  readonly provider: string
  readonly model: string
  readonly turn: number
  readonly step: number
  readonly usage: TokenUsage
}

/** One dispatched model request retained for request-count bucketing. */
interface RequestRecord {
  readonly sessionId: SessionId
  readonly time: number
  readonly provider: string
  readonly model: string
}

/** Per-session replay cursor and current route facts. */
interface SessionState {
  consumedEvents: number
  provider: string | undefined
  model: string | undefined
}

/** Parsed minutes range for fast peak comparison. */
interface ResolvedPeakInterval {
  readonly start: string
  readonly end: string
  readonly startMinutes: number
  readonly endMinutes: number
}

interface ResolvedPeakSchedule {
  readonly weekendOffpeak: boolean
  readonly intervals: readonly ResolvedPeakInterval[]
}

/** Validated plugin configuration. */
interface ResolvedConfig {
  readonly currency?: string
  readonly peakSchedule: ResolvedPeakSchedule
  readonly pricing: Readonly<Record<string, Readonly<ModelPricing>>>
}

function getPricingStoragePath(): string {
  const dshDir = path.join(os.homedir(), '.dsh')
  if (!existsSync(dshDir)) {
    try { mkdirSync(dshDir, { recursive: true }) } catch {}
  }
  return path.join(dshDir, 'token-usage-pricing.json')
}

function loadPersistedPricing(): TokenUsageStatsConfig | undefined {
  try {
    const file = getPricingStoragePath()
    if (existsSync(file)) {
      const raw = readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
      return JSON.parse(raw) as TokenUsageStatsConfig
    }
  } catch (err) {
    console.error('[token-usage-stats] failed to read token-usage-pricing.json:', err)
  }
  return undefined
}

function savePersistedPricing(payload: PricingConfigPayload): void {
  const file = getPricingStoragePath()
  writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8')
}

const ZSTD_MAGIC = 0xFD2FB528

interface ZstdFrameRange {
  readonly start: number
  readonly end: number
}

function scanConcatenatedZstdFrames(buffer: Buffer): ZstdFrameRange[] {
  const frames: ZstdFrameRange[] = []
  let offset = 0
  while (offset < buffer.length) {
    const start = offset
    if (buffer.length - offset < 4) break
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) break
    offset += 4
    if (offset === buffer.length) break
    const descriptor = buffer.readUInt8(offset)
    offset += 1
    const contentSizeFlag = descriptor >>> 6
    const singleSegment = (descriptor & 0x20) !== 0
    const checksum = (descriptor & 0x04) !== 0
    const dictionaryFlag = descriptor & 0x03
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag
    const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag
    const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes
    if (buffer.length - offset < remainingHeaderBytes) break
    offset += remainingHeaderBytes
    for (;;) {
      if (buffer.length - offset < 3) break
      const blockHeader = buffer.readUIntLE(offset, 3)
      offset += 3
      const lastBlock = (blockHeader & 1) !== 0
      const blockType = (blockHeader >>> 1) & 0x03
      const blockSize = blockHeader >>> 3
      const payloadBytes = blockType === 0x01 ? 1 : blockSize
      if (buffer.length - offset < payloadBytes) break
      offset += payloadBytes
      if (lastBlock) break
    }
    if (checksum) {
      if (buffer.length - offset < 4) break
      offset += 4
    }
    frames.push({ start, end: offset })
  }
  return frames
}

async function decompressConcatenatedZstd(buffer: Buffer): Promise<string> {
  const frames = scanConcatenatedZstdFrames(buffer)
  if (frames.length === 0) {
    return await new Promise<string>((resolve) => {
      zstdDecompress(buffer, (err, out) => {
        if (err || !out) resolve('')
        else resolve(out.toString('utf8'))
      })
    })
  }
  let result = ''
  for (const f of frames) {
    const slice = buffer.subarray(f.start, f.end)
    const chunk = await new Promise<string>((resolve) => {
      zstdDecompress(slice, (err, out) => {
        if (err || !out) resolve('')
        else resolve(out.toString('utf8'))
      })
    })
    result += chunk
  }
  return result
}

function projectKeySlug(cwd: string): string {
  let readable = ''
  let separatorRun = false
  for (let i = 0; i < cwd.length; i++) {
    const code = cwd.charCodeAt(i)
    const ch = String.fromCharCode(code)
    if (ch === '/' || ch === '\\' || ch === ':') {
      if (!separatorRun) readable += '-'
      separatorRun = true
    } else if (ch !== '~' && /^[A-Za-z0-9._-]$/.test(ch)) {
      readable += ch
      separatorRun = false
    } else {
      readable += '~' + code.toString(16).toUpperCase().padStart(4, '0')
      separatorRun = false
    }
  }
  const slug = readable.replace(/^-+/, '') || 'root'
  return `--${slug.slice(0, 251)}--`
}

const DEFAULT_PEAK_INTERVALS: readonly PeakInterval[] = [
  { start: '09:00', end: '12:00' },
  { start: '14:00', end: '18:00' },
]

function parseTimeString(timeStr: string, field: string): { minutes: number; formatted: string } {
  if (typeof timeStr !== 'string') {
    throw new Error(`TokenUsageStatsConfig: peakSchedule interval "${field}" must be a string, got ${typeof timeStr}`)
  }
  const clean = timeStr.replace(/：/g, ':').trim().replace(/\s+/g, '')
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(clean)
  if (!match) {
    throw new Error(`TokenUsageStatsConfig: peakSchedule interval "${field}" must be "HH:MM" (00:00 - 23:59), got "${timeStr}"`)
  }
  // oxlint-disable-next-line typescript/no-non-null-assertion
  const h = Number.parseInt(match[1]!, 10)
  // oxlint-disable-next-line typescript/no-non-null-assertion
  const m = Number.parseInt(match[2]!, 10)
  const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  return { minutes: h * 60 + m, formatted }
}

/** Local mutable face used while building readonly public values. */
type Mutable<T> = { -readonly [K in keyof T]: T[K] }

const PRICING_KEYS = new Set([
  'uncachedInputPerMillion',
  'cacheReadPerMillion',
  'cacheWritePerMillion',
  'outputPerMillion',
])

/**
 * Upper bound on series buckets. Guards the unauthenticated API against
 * range amplification (`from=0&granularity=hour` alone would allocate ~496k
 * buckets from epoch). Hourly buckets cover ~13 months and daily ~27 years,
 * so legitimate dashboard ranges stay under the cap; an explicit or implied
 * wider range is rejected as a query error.
 */
const MAX_SERIES_BUCKETS = 10_000

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Reject stale or misspelled keys and malformed pricing before defaults can hide them. */
function validateConfig(config: TokenUsageStatsConfig): ResolvedConfig {
  if (typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('TokenUsageStatsConfig: config must be an object')
  }
  const allowed = new Set(['currency', 'pricing', 'peakSchedule'])
  for (const key of Object.keys(config)) {
    if (!allowed.has(key)) {
      throw new Error(`TokenUsageStatsConfig: unknown key "${key}"`)
    }
  }

  const currency = config.currency
  if (currency !== undefined && (typeof currency !== 'string' || currency.length === 0)) {
    throw new Error('TokenUsageStatsConfig: currency must be a non-empty string')
  }

  let weekendOffpeak = true
  const intervals: ResolvedPeakInterval[] = []
  if (config.peakSchedule !== undefined) {
    if (typeof config.peakSchedule !== 'object' || Array.isArray(config.peakSchedule)) {
      throw new Error('TokenUsageStatsConfig: peakSchedule must be an object')
    }
    if (config.peakSchedule.weekendOffpeak !== undefined) {
      if (typeof config.peakSchedule.weekendOffpeak !== 'boolean') {
        throw new Error('TokenUsageStatsConfig: peakSchedule.weekendOffpeak must be a boolean')
      }
      weekendOffpeak = config.peakSchedule.weekendOffpeak
    }
    const rawIntervals = config.peakSchedule.intervals ?? DEFAULT_PEAK_INTERVALS
    if (!Array.isArray(rawIntervals)) {
      throw new Error('TokenUsageStatsConfig: peakSchedule.intervals must be an array')
    }
    for (let i = 0; i < rawIntervals.length; i++) {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      const item = rawIntervals[i]!
      if (typeof item !== 'object' || item === null) {
        throw new Error(`TokenUsageStatsConfig: peakSchedule.intervals[${i}] must be an object`)
      }
      const parsedStart = parseTimeString(item.start, `intervals[${i}].start`)
      const parsedEnd = parseTimeString(item.end, `intervals[${i}].end`)
      intervals.push({
        start: parsedStart.formatted,
        end: parsedEnd.formatted,
        startMinutes: parsedStart.minutes,
        endMinutes: parsedEnd.minutes,
      })
    }
  } else {
    for (const item of DEFAULT_PEAK_INTERVALS) {
      intervals.push({
        start: item.start,
        end: item.end,
        startMinutes: parseTimeString(item.start, 'default.start').minutes,
        endMinutes: parseTimeString(item.end, 'default.end').minutes,
      })
    }
  }

  const parseTier = (value: Readonly<ModelPriceTier>, path: string): Mutable<ModelPriceTier> => {
    for (const key of Object.keys(value)) {
      if (!PRICING_KEYS.has(key)) {
        throw new Error(`TokenUsageStatsConfig: pricing "${path}" has unknown key "${key}"`)
      }
    }
    const tier: Mutable<ModelPriceTier> = {}
    const check = (
      key: 'uncachedInputPerMillion' | 'cacheReadPerMillion' | 'cacheWritePerMillion' | 'outputPerMillion',
    ): void => {
      const entry = value[key]
      if (entry !== undefined) {
        if (!isNonNegativeFinite(entry)) {
          throw new Error(`TokenUsageStatsConfig: pricing "${path}.${key}" must be a non-negative finite number`)
        }
        tier[key] = entry
      }
    }
    check('uncachedInputPerMillion')
    check('cacheReadPerMillion')
    check('cacheWritePerMillion')
    check('outputPerMillion')
    return tier
  }

  const pricing: Record<string, ModelPricing> = {}
  if (config.pricing !== undefined) {
    if (typeof config.pricing !== 'object' || Array.isArray(config.pricing)) {
      throw new Error('TokenUsageStatsConfig: pricing must be a record')
    }
    for (const [model, value] of Object.entries(config.pricing)) {
      if (model.length === 0) {
        throw new Error('TokenUsageStatsConfig: pricing model must be a non-empty string')
      }
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`TokenUsageStatsConfig: pricing for "${model}" must be an object`)
      }
      const keys = Object.keys(value)
      const hasTier = keys.includes('peak') || keys.includes('offpeak')
      const allowed = new Set(hasTier ? [...PRICING_KEYS, 'peak', 'offpeak'] : [...PRICING_KEYS])
      for (const key of keys) {
        if (!allowed.has(key)) {
          throw new Error(`TokenUsageStatsConfig: pricing for "${model}" has unknown key "${key}"`)
        }
      }
      const price: Mutable<ModelPricing> = {}
      if (hasTier) {
        if (value.peak !== undefined) {
          if (typeof value.peak !== 'object' || Array.isArray(value.peak)) {
            throw new Error(`TokenUsageStatsConfig: pricing "${model}.peak" must be an object`)
          }
          price.peak = deepFreeze(parseTier(value.peak, `${model}.peak`))
        }
        if (value.offpeak !== undefined) {
          if (typeof value.offpeak !== 'object' || Array.isArray(value.offpeak)) {
            throw new Error(`TokenUsageStatsConfig: pricing "${model}.offpeak" must be an object`)
          }
          price.offpeak = deepFreeze(parseTier(value.offpeak, `${model}.offpeak`))
        }
      } else {
        const tier = parseTier(value, model)
        if (tier.uncachedInputPerMillion !== undefined) price.uncachedInputPerMillion = tier.uncachedInputPerMillion
        if (tier.cacheReadPerMillion !== undefined) price.cacheReadPerMillion = tier.cacheReadPerMillion
        if (tier.cacheWritePerMillion !== undefined) price.cacheWritePerMillion = tier.cacheWritePerMillion
        if (tier.outputPerMillion !== undefined) price.outputPerMillion = tier.outputPerMillion
      }
      pricing[model] = deepFreeze(price)
    }
  }

  return deepFreeze({
    ...(currency === undefined ? {} : { currency }),
    peakSchedule: deepFreeze({
      weekendOffpeak,
      intervals: deepFreeze(intervals),
    }),
    pricing: deepFreeze(pricing),
  })
}

/** Floor a timestamp to a UTC hour or day boundary. */
function startOfBucket(time: number, granularity: 'hour' | 'day'): number {
  const date = new Date(time)
  if (granularity === 'day') {
    date.setUTCHours(0, 0, 0, 0)
  } else {
    date.setUTCMinutes(0, 0, 0)
  }
  return date.getTime()
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    tokenUsageStats: TokenUsageStats
  }
}

/**
 * Replay-aware cross-session usage analytics service.
 *
 * The service observes `session/event`, replays already-live sessions on mount,
 * and keeps per-step usage samples so a later final `assistant/message` replaces
 * an earlier usage chunk instead of double counting. Request counts come from
 * each completed `assistant/message` (one per model call).
 */
export class TokenUsageStats extends Service {
  static inject = ['sessions']
  // Schemastery preserves untrusted loader keys on an empty object schema;
  // validateConfig rejects unknown keys and validates nested pricing manually.
  static Config: z<TokenUsageStatsConfig> = z.object({})

  private config: ResolvedConfig
  private readonly usageByStep = new Map<string, number>()
  private readonly usageRecords: UsageRecord[] = []
  private readonly requestRecords: RequestRecord[] = []
  private readonly states = new WeakMap<Session, SessionState>()
  private readonly persistedSeq = new Map<SessionId, number>()
  private readonly persistedRevisions = new Map<SessionId, string>()
  /** Latest folded `session/title` text per session (last-wins). */
  private readonly titles = new Map<SessionId, string>()
  /** Persistent map from sessionId to last detected model/provider. */
  private readonly sessionModels = new Map<SessionId, { provider?: string | undefined; model?: string | undefined }>()
  private persistence: SessionPersistence | undefined
  private lastRehydrateTime = 0
  private rehydrating: Promise<void> | undefined

  /** Trigger non-blocking background rehydration throttled to at most once per 4 seconds. */
  private async _scheduleRehydrate(): Promise<void> {
    const now = Date.now()
    if (now - this.lastRehydrateTime < 4000 || this.rehydrating !== undefined) {
      return
    }
    this.lastRehydrateTime = now
    try {
      this.rehydrating = this._rehydrate()
      await this.rehydrating
    } catch {
      // Ignore background rehydration error
    } finally {
      this.rehydrating = undefined
    }
  }

  constructor(ctx: Context, config: TokenUsageStatsConfig = {}) {
    super(ctx, 'tokenUsageStats')
    const persisted = loadPersistedPricing()
    const merged = persisted
      ? {
          ...config,
          ...persisted,
          pricing: { ...(config.pricing ?? {}), ...(persisted.pricing ?? {}) },
        }
      : config
    this.config = validateConfig(merged)

    for (const session of ctx.sessions.list()) this._sync(session)
    ctx.inject(['sessionPersistence'], (persistenceCtx) => {
      this.persistence = persistenceCtx.sessionPersistence
      void this._rehydrate(persistenceCtx.sessionPersistence).catch((error: unknown) => {
        this.ctx.logger.warn(`token usage stats: rehydration failed: ${String(error)}`)
      })
    })
    // Serve the dashboard from this plugin when the webserver is present (the
    // web profile); a headless profile simply never mounts the routes.
    ctx.inject(['webServer'], (webCtx) => {
      webCtx.effect(() => {
        const removePage = webCtx.webServer.register({
          kind: 'exact',
          path: '/token-usage-stats',
          handler: (req, res) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              res.writeHead(405)
              res.end()
              return
            }
            res.writeHead(200, {
              'content-type': 'text/html; charset=utf-8',
              'cache-control': 'no-store',
            })
            if (req.method === 'HEAD') {
              res.end()
            } else {
              res.end(renderUsageDashboard())
            }
          },
        })
        const removeApi = webCtx.webServer.register({
          kind: 'exact',
          path: '/api/token-usage-stats',
          handler: (req, res) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              res.writeHead(405)
              res.end()
              return
            }
            // Trigger background sync without blocking this response
            void this._scheduleRehydrate()

            // node:http always sets url on server requests; `?? '/'` keeps the
            // fallback valid for the optional IncomingMessage.url type.
            const url = new URL(req.url ?? '/', 'http://x')
            let snapshot
            try {
              snapshot = this.snapshot(parseTokenUsageStatsQuery(url.searchParams))
            } catch (error) {
              // A rejected series range (e.g. from/to spanning more than the bucket
              // cap) is a client query error, not a server fault.
              res.writeHead(400, {
                'content-type': 'application/json; charset=utf-8',
                'cache-control': 'no-store',
              })
              res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
              return
            }
            res.writeHead(200, {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store',
            })
            if (req.method === 'HEAD') {
              res.end()
            } else {
              res.end(JSON.stringify(snapshot))
            }
          },
        })
        const removePricingApi = webCtx.webServer.register({
          kind: 'exact',
          path: '/api/token-usage-stats/pricing',
          handler: (req, res) => {
            if (req.method === 'GET') {
              res.writeHead(200, {
                'content-type': 'application/json; charset=utf-8',
                'cache-control': 'no-store',
              })
              res.end(JSON.stringify(this.getPricingConfig()))
              return
            }
            if (req.method === 'POST') {
              let body = ''
              req.setEncoding('utf8')
              req.on('data', (chunk) => {
                body += chunk
              })
              req.on('end', () => {
                try {
                  const payload = JSON.parse(body) as PricingConfigPayload
                  this.updatePricingConfig(payload)
                  res.writeHead(200, {
                    'content-type': 'application/json; charset=utf-8',
                    'cache-control': 'no-store',
                  })
                  res.end(JSON.stringify({ ok: true }))
                } catch (error) {
                  res.writeHead(400, {
                    'content-type': 'application/json; charset=utf-8',
                    'cache-control': 'no-store',
                  })
                  res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
                }
              })
              return
            }
            res.writeHead(405)
            res.end()
          },
        })
        return () => {
          removePage()
          removeApi()
          removePricingApi()
        }
      }, 'token-usage-stats: dashboard routes')
    })
    ctx.on('session/event', (session) => {
      this._sync(session)
    })
  }

  /** Return the currently effective pricing settings and schedule. */
  getPricingConfig(): PricingConfigPayload {
    const rawPricing: Record<string, ModelPricing> = {}
    for (const [model, p] of Object.entries(this.config.pricing)) {
      rawPricing[model] = p
    }
    return {
      ...(this.config.currency === undefined ? {} : { currency: this.config.currency }),
      peakSchedule: {
        weekendOffpeak: this.config.peakSchedule.weekendOffpeak,
        intervals: this.config.peakSchedule.intervals.map(({ start, end }) => ({ start, end })),
      },
      pricing: rawPricing,
    }
  }

  /** Atomically persist and immediately apply updated pricing rules. */
  updatePricingConfig(payload: PricingConfigPayload): void {
    const configToValidate: TokenUsageStatsConfig = {
      ...(payload.currency === undefined ? {} : { currency: payload.currency }),
      ...(payload.peakSchedule === undefined ? {} : { peakSchedule: payload.peakSchedule }),
      pricing: payload.pricing,
    }
    const resolved = validateConfig(configToValidate)
    savePersistedPricing(payload)
    this.config = resolved
  }

  /**
   * Return a detached immutable analytics snapshot.
   * @param query - optional time/model/granularity filters.
   * @returns aggregate totals, per-model totals, and time-bucketed series.
   * @throws RangeError when the filtered series range would exceed the
   *   {@link MAX_SERIES_BUCKETS} bucket cap (an explicit from/to spanning too
   *   wide, or records so far apart they imply more buckets than the cap).
   */
  snapshot(query: TokenUsageStatsQuery = {}): TokenUsageStatsSnapshot {
    const from = query.from
    const to = query.to
    const model = query.model
    const granularity = query.granularity ?? 'hour'
    const inRange = (time: number): boolean =>
      (from === undefined || time >= from) && (to === undefined || time <= to)
    const matches = (value: string): boolean => model === undefined || value === model

    const usageRecords = this.usageRecords.filter(record => inRange(record.time) && matches(record.model))
    const requestRecords = this.requestRecords.filter(record => inRange(record.time) && matches(record.model))

    return deepFreeze({
      ...(this.config.currency === undefined ? {} : { currency: this.config.currency }),
      totals: this._totals(usageRecords, requestRecords.length),
      models: this._models(usageRecords, requestRecords),
      series: this._series(usageRecords, requestRecords, from, to, granularity),
      topSessions: this._topSessions(usageRecords, requestRecords),
    })
  }

  /** Catch one session's fold up to the current durable tail. */
  private _sync(session: Session): void {
    let state = this.states.get(session)
    if (state === undefined) {
      const remembered = this.sessionModels.get(session.id)
      state = {
        consumedEvents: this.persistedSeq.get(session.id) ?? 0,
        provider: remembered?.provider,
        model: remembered?.model,
      }
      this.states.set(session, state)
    }

    // 若尚未记住模型，从现有事件中前向快速检索
    if (!state.model && session.events.length > 0) {
      for (let i = 0; i < session.events.length; i++) {
        const ev = session.events[i]
        if (ev?.type === 'request/context') {
          state.provider = ev.data.provider
          state.model = ev.data.model
          if (state.model) break
        } else if (ev?.type === 'request/header') {
          state.provider = ev.data.header.config.provider
          state.model = ev.data.header.config.model
          if (state.model) break
        }
      }
      if (state.model) {
        this.sessionModels.set(session.id, { provider: state.provider, model: state.model })
      }
    }

    while (state.consumedEvents < session.events.length) {
      // Session construction validates contiguous seqs, so the current index exists.
      // oxlint-disable-next-line typescript/no-non-null-assertion
      const event = session.events[state.consumedEvents]!
      this._foldEvent(session.id, state, event)
      state.consumedEvents += 1
    }
  }

  /**
   * Directly read and parse session events from the disk file, bypassing
   * format-version migrations and strict assertion rejections.
   */
  private async _fallbackReadSession(
    snapshot: { header: { id: SessionId; cwd?: string } },
  ): Promise<readonly SessionEvent[]> {
    const root = (this.persistence as unknown as { root?: string })?.root
      ?? path.join(os.homedir(), '.dsh', 'sessions')
    const id = snapshot.header.id
    const cwd = snapshot.header.cwd
    const pKey = cwd ? projectKeySlug(cwd) : '_no-cwd'
    const dir = path.join(root, pKey, id)
    if (!existsSync(dir)) return []

    let files: string[] = []
    try {
      files = readdirSync(dir)
    } catch {
      return []
    }

    const logFiles = files.filter(f => f.startsWith('session') && (f.endsWith('.zstd') || f.endsWith('.jsonl')))
    if (logFiles.length === 0) return []
    // Latest format version first (v2 -> v1 -> v0)
    logFiles.sort().reverse()
    const targetFile = path.join(dir, logFiles[0]!)
    const isZstd = targetFile.endsWith('.zstd')

    let rawText = ''
    try {
      if (isZstd) {
        const buf = readFileSync(targetFile)
        rawText = await decompressConcatenatedZstd(buf)
      } else {
        rawText = readFileSync(targetFile, 'utf8')
      }
    } catch {
      return []
    }

    if (!rawText) return []
    const lines = rawText.trim().split('\n')
    const events: SessionEvent[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!.trim()
      if (!line) continue
      try {
        const ev = JSON.parse(line) as SessionEvent
        if (ev && typeof ev === 'object' && typeof ev.type === 'string') {
          events.push(ev)
        }
      } catch {}
    }
    return events
  }

  /**
   * Replay materialized persisted sessions so a process restart keeps the
   * aggregate. Live sessions are skipped: their constructor-time sync already
   * counted the same log, and a persisted session opened later starts its live
   * fold after the replayed seq.
   */
  private async _rehydrate(sessionPersistence?: SessionPersistence): Promise<void> {
    const sp = sessionPersistence ?? this.persistence
    if (!sp) return
    this.persistence = sp
    const anyPersistence = sp as unknown as {
      list?: () => Promise<readonly { header: { id: SessionId; cwd?: string } }[]>
      listSnapshots?: () => Promise<readonly { header: { id: SessionId; cwd?: string } }[]>
      open?: (id: SessionId, access: string) => Promise<{
        read: () => Promise<readonly SessionEvent[]>
        close: () => Promise<void>
      }>
      inspect?: (id: SessionId) => Promise<{ events: readonly SessionEvent[] }>
    }

    const listFn = anyPersistence.list ?? anyPersistence.listSnapshots
    if (typeof listFn !== 'function') return
    const snapshots = await listFn.call(anyPersistence)
    for (const snapshot of snapshots) {
      const id = snapshot.header.id
      const rev = (snapshot as { revision?: unknown }).revision !== undefined
        ? String((snapshot as { revision?: unknown }).revision)
        : undefined
      const lastRev = this.persistedRevisions.get(id)
      const lastSeq = this.persistedSeq.get(id) ?? 0

      // If the revision matches and we already processed this session, skip opening the file completely
      if (rev !== undefined && lastRev !== undefined && lastRev === rev && lastSeq > 0) {
        continue
      }

      let events: readonly SessionEvent[] = []
      let openedByOfficial = false
      try {
        if (typeof anyPersistence.open === 'function') {
          const handle = await anyPersistence.open(id, 'read')
          try {
            events = await handle.read()
            openedByOfficial = true
          } finally {
            await handle.close()
          }
        } else if (typeof anyPersistence.inspect === 'function') {
          const inspection = await anyPersistence.inspect(id)
          events = inspection.events
          openedByOfficial = true
        }
      } catch {
        // Official sessionPersistence.open failed; fall through to fallback read
      }

      if (!openedByOfficial || events.length === 0) {
        const fallbackEvents = await this._fallbackReadSession(snapshot)
        if (fallbackEvents.length > 0) {
          events = fallbackEvents
        }
      }

      // 无论何种方式，记录 revision 杜绝无休止的重复尝试
      if (rev !== undefined) {
        this.persistedRevisions.set(id, rev)
      }

      // 让出事件循环微任务，杜绝大批量文件处理卡死主线程
      await new Promise(resolve => setImmediate(resolve))

      if (events.length <= lastSeq) continue

      this.persistedSeq.set(id, events.length)
      const live = this.ctx.sessions.get(id)
      if (live !== undefined) {
        const liveState = this.states.get(live)
        if (liveState !== undefined && liveState.consumedEvents >= events.length) continue
      }

      const remembered = this.sessionModels.get(id)
      const state: SessionState = {
        consumedEvents: lastSeq,
        provider: remembered?.provider,
        model: remembered?.model,
      }

      // 增量场景下若当前 state 缺失 model，从完整事件列表中快速前向探查
      if (!state.model && events.length > 0) {
        for (let i = 0; i < events.length; i++) {
          const ev = events[i]
          if (ev?.type === 'request/context') {
            state.provider = ev.data.provider
            state.model = ev.data.model
            if (state.model) break
          } else if (ev?.type === 'request/header') {
            state.provider = ev.data.header.config.provider
            state.model = ev.data.header.config.model
            if (state.model) break
          }
        }
        if (state.model) {
          this.sessionModels.set(id, { provider: state.provider, model: state.model })
        }
      }

      for (let i = lastSeq; i < events.length; i++) {
        // Session construction ensures non-null contiguous events
        // oxlint-disable-next-line typescript/no-non-null-assertion
        this._foldEvent(id, state, events[i]!)
        state.consumedEvents += 1
      }
    }
  }

  /** Fold one event into route state and aggregate records. */
  private _foldEvent(session: SessionId, state: SessionState, event: SessionEvent): void {
    switch (event.type) {
      case 'request/header': {
        const config = event.data.header.config
        state.provider = config.provider
        state.model = config.model
        if (state.model) {
          this.sessionModels.set(session, { provider: state.provider, model: state.model })
        }
        break
      }
      case 'request/context':
        state.provider = event.data.provider
        state.model = event.data.model
        if (state.model) {
          this.sessionModels.set(session, { provider: state.provider, model: state.model })
        }
        break
      case 'assistant/chunk':
        if (event.data.chunk.type === 'usage') {
          this._recordUsage(
            session,
            state,
            event.time,
            event.data.turn,
            event.data.step,
            event.data.chunk.usage,
          )
        }
        break
      case 'assistant/message':
        // One API request per completed model call: `request/header` and
        // `request/context` are change-only snapshots, so the only per-request
        // signal in the log is the final assistant message.
        this._recordRequest(session, event.time, state.provider ?? 'unknown', state.model ?? 'unknown')
        if (event.data.usage !== undefined) {
          this._recordUsage(
            session,
            state,
            event.time,
            event.data.turn,
            event.data.step,
            event.data.usage,
          )
        }
        break
      case 'session/title':
        this.titles.set(session, event.data.title)
        break
      default:
        break
    }
  }

  /** Record one provider usage sample, replacing any earlier same-step sample. */
  private _recordUsage(
    sessionId: SessionId,
    state: SessionState,
    time: number,
    turn: number,
    step: number,
    usage: TokenUsage,
  ): void {
    const key = `${sessionId}:${turn}:${step}`
    const record: UsageRecord = {
      sessionId,
      time,
      provider: state.provider ?? 'unknown',
      model: state.model ?? 'unknown',
      turn,
      step,
      usage,
    }
    const existingIndex = this.usageByStep.get(key)
    if (existingIndex !== undefined) {
      this.usageRecords[existingIndex] = record
    } else {
      this.usageByStep.set(key, this.usageRecords.length)
      this.usageRecords.push(record)
    }
  }

  /** Record one dispatched request for count bucketing. */
  private _recordRequest(sessionId: SessionId, time: number, provider: string, model: string): void {
    this.requestRecords.push({ sessionId, time, provider, model })
  }

  /**
   * True during configured peak intervals.
   * Weekends (Beijing Saturday/Sunday) are off-peak when weekendOffpeak is true.
   * Beijing time is fixed UTC+8, so reading UTC fields of a +8-shifted epoch
   * yields the Beijing wall-clock date, hour, and minute.
   * @param time - the usage record's time (Unix ms).
   */
  private _isPeak(time: number): boolean {
    const beijing = new Date(time + 8 * 3_600_000)
    const day = beijing.getUTCDay()
    if (this.config.peakSchedule.weekendOffpeak && (day === 0 || day === 6)) {
      return false
    }
    const minutes = beijing.getUTCHours() * 60 + beijing.getUTCMinutes()
    for (const interval of this.config.peakSchedule.intervals) {
      if (minutes >= interval.startMinutes && minutes < interval.endMinutes) {
        return true
      }
    }
    return false
  }

  /**
   * One price key for a model at the given time: the peak/off-peak tier when
   * the model is tiered, else the flat top-level key.
   * @param model - provider model id.
   * @param time - the usage record's time (Unix ms) used to pick the tier.
   * @param key - the price key to read.
   */
  private _price(model: string, time: number, key: keyof ModelPriceTier): number | undefined {
    const price = this.config.pricing[model]
    if (price === undefined) return undefined
    if (price.peak !== undefined || price.offpeak !== undefined) {
      const tier = this._isPeak(time) ? (price.peak ?? price.offpeak) : (price.offpeak ?? price.peak)
      return tier?.[key]
    }
    return price[key]
  }

  /** Compute cost for one usage record, or undefined when no pricing is configured. */
  private _costFor(model: string, usage: TokenUsage, time: number): number | undefined {
    if (this.config.pricing[model] === undefined) return undefined
    return (
      usage.inputTokens * (this._price(model, time, 'uncachedInputPerMillion') ?? 0)
      + (usage.cacheReadTokens ?? 0) * (this._price(model, time, 'cacheReadPerMillion') ?? 0)
      + (usage.cacheWriteTokens ?? 0) * (this._price(model, time, 'cacheWritePerMillion') ?? 0)
      + usage.outputTokens * (this._price(model, time, 'outputPerMillion') ?? 0)
    ) / 1_000_000
  }

  /** Aggregate a set of usage records and a request count. */
  private _totals(usageRecords: readonly UsageRecord[], requestCount: number): UsageTotals {
    const totals: Mutable<UsageTotals> = {
      requestCount,
      uncachedInputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    }
    let cost: number | undefined
    let allPriced = true
    for (const record of usageRecords) {
      totals.uncachedInputTokens += record.usage.inputTokens
      totals.cacheReadTokens += record.usage.cacheReadTokens ?? 0
      totals.cacheWriteTokens += record.usage.cacheWriteTokens ?? 0
      totals.outputTokens += record.usage.outputTokens
      const recordCost = this._costFor(record.model, record.usage, record.time)
      if (recordCost === undefined) allPriced = false
      else cost = (cost ?? 0) + recordCost
    }
    totals.totalTokens = totals.uncachedInputTokens
      + totals.cacheReadTokens
      + totals.cacheWriteTokens
      + totals.outputTokens
    // Report cost only when every contributing model has a pricing entry;
    // a partially priced scope must not present a partial sum as the full cost.
    if (cost !== undefined && allPriced) totals.cost = cost
    return totals
  }

  /** Group usage and request records by provider/model pair. */
  private _models(
    usageRecords: readonly UsageRecord[],
    requestRecords: readonly RequestRecord[],
  ): ModelUsage[] {
    const grouped = new Map<string, {
      provider: string
      model: string
      requestCount: number
      usageRecords: UsageRecord[]
    }>()
    for (const record of requestRecords) {
      const key = `${record.provider}\u0000${record.model}`
      let group = grouped.get(key)
      if (group === undefined) {
        group = { provider: record.provider, model: record.model, requestCount: 0, usageRecords: [] }
        grouped.set(key, group)
      }
      group.requestCount += 1
    }
    for (const record of usageRecords) {
      const key = `${record.provider}\u0000${record.model}`
      let group = grouped.get(key)
      if (group === undefined) {
        group = { provider: record.provider, model: record.model, requestCount: 0, usageRecords: [] }
        grouped.set(key, group)
      }
      group.usageRecords.push(record)
    }
    return [...grouped.values()].map(group => ({
      provider: group.provider,
      model: group.model,
      totals: this._totals(group.usageRecords, group.requestCount),
    }))
  }

  /** Bucket filtered records into contiguous UTC hour/day bins. */
  private _series(
    usageRecords: readonly UsageRecord[],
    requestRecords: readonly RequestRecord[],
    from: number | undefined,
    to: number | undefined,
    granularity: 'hour' | 'day',
  ): UsageSeriesPoint[] {
    if (usageRecords.length === 0 && requestRecords.length === 0) return []

    const times = [
      ...usageRecords.map(record => record.time),
      ...requestRecords.map(record => record.time),
    ]
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const start = from ?? minTime
    const end = to ?? maxTime
    const bucketSize = granularity === 'day' ? 86_400_000 : 3_600_000
    const firstStart = startOfBucket(start, granularity)
    const bucketCount = Math.max(1, Math.floor((end - firstStart) / bucketSize) + 1)
    if (bucketCount > MAX_SERIES_BUCKETS) {
      throw new RangeError(
        `token usage stats: series range spans ${bucketCount} ${granularity} buckets, exceeding the ${MAX_SERIES_BUCKETS} bucket limit (narrow the from/to range or choose a coarser granularity)`,
      )
    }
    const buckets = Array.from({ length: bucketCount }, (_, index) => ({
      startTime: firstStart + index * bucketSize,
      usageRecords: [] as UsageRecord[],
      requestCount: 0,
    }))

    for (const record of usageRecords) {
      const index = Math.min(buckets.length - 1, Math.max(0, Math.floor((record.time - firstStart) / bucketSize)))
      buckets[index]?.usageRecords.push(record)
    }
    for (const record of requestRecords) {
      const index = Math.min(buckets.length - 1, Math.max(0, Math.floor((record.time - firstStart) / bucketSize)))
      const bucket = buckets[index]
      if (bucket !== undefined) {
        bucket.requestCount += 1
      }
    }

    return buckets.map(bucket => {
      const byModel = new Map<string, number>()
      for (const record of bucket.usageRecords) {
        const cost = this._costFor(record.model, record.usage, record.time)
        if (cost !== undefined) byModel.set(record.model, (byModel.get(record.model) ?? 0) + cost)
      }
      return {
        startTime: bucket.startTime,
        endTime: bucket.startTime + bucketSize,
        totals: this._totals(bucket.usageRecords, bucket.requestCount),
        models: [...byModel.entries()].map(([model, cost]) => ({ model, cost })),
      }
    })
  }

  /** Group filtered records by session and return the richest first (top 5). */
  private _topSessions(usageRecords: readonly UsageRecord[], requestRecords: readonly RequestRecord[]): SessionUsage[] {
    const bySession = new Map<SessionId, { usage: UsageRecord[]; requests: number; last: number }>()
    for (const record of usageRecords) {
      let entry = bySession.get(record.sessionId)
      if (entry === undefined) {
        entry = { usage: [], requests: 0, last: 0 }
        bySession.set(record.sessionId, entry)
      }
      entry.usage.push(record)
      if (record.time > entry.last) entry.last = record.time
    }
    for (const record of requestRecords) {
      const entry = bySession.get(record.sessionId)
      if (entry !== undefined) {
        entry.requests += 1
        if (record.time > entry.last) entry.last = record.time
      }
    }
    return [...bySession.entries()]
      .map(([id, entry]) => ({
        id: String(id),
        title: this.titles.get(id) ?? null,
        lastTime: entry.last,
        totals: this._totals(entry.usage, entry.requests),
      }))
      .sort((left, right) => (right.totals.cost ?? 0) - (left.totals.cost ?? 0)
        || right.totals.totalTokens - left.totals.totalTokens)
      .slice(0, 5)
  }
}

export default TokenUsageStats
