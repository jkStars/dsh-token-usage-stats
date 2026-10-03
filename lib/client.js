window.__ModuleLoader__.load({
	id: "dsh-token-usage-stats",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
		//#endregion
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region node_modules/.pnpm/react@18.2.0/node_modules/react/cjs/react-jsx-runtime.production.min.js
		/**
		* @license React
		* react-jsx-runtime.production.min.js
		*
		* Copyright (c) Facebook, Inc. and its affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*/
		var require_react_jsx_runtime_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			var f = require("react");
			var k = Symbol.for("react.element");
			var l = Symbol.for("react.fragment");
			var m = Object.prototype.hasOwnProperty;
			var n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner;
			var p = {
				key: !0,
				ref: !0,
				__self: !0,
				__source: !0
			};
			function q(c, a, g) {
				var b, d = {}, e = null, h = null;
				void 0 !== g && (e = "" + g);
				void 0 !== a.key && (e = "" + a.key);
				void 0 !== a.ref && (h = a.ref);
				for (b in a) m.call(a, b) && !p.hasOwnProperty(b) && (d[b] = a[b]);
				if (c && c.defaultProps) for (b in a = c.defaultProps, a) void 0 === d[b] && (d[b] = a[b]);
				return {
					$$typeof: k,
					type: c,
					key: e,
					ref: h,
					props: d,
					_owner: n.current
				};
			}
			exports.Fragment = l;
			exports.jsx = q;
			exports.jsxs = q;
		}));
		//#endregion
		//#region \0dsh-css:D:\PC\develop\dsh\dsh-token-usage-stats\src\client\TokenUsageStatsAction.module.css.mjs
		var import_jsx_runtime = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_react_jsx_runtime_production_min();
		})))();
		const css = ".KNBqaW_root{box-sizing:border-box;width:100%;min-width:0;height:36px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;margin-bottom:4px;padding:0 8px;text-decoration:none;display:flex}.KNBqaW_root:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.KNBqaW_root:focus-visible{outline:2px solid var(--dsw-alias-accent,#2563eb);outline-offset:-2px}.KNBqaW_label{white-space:nowrap;text-overflow:ellipsis;min-width:0;overflow:hidden}.KNBqaW_railOnly{border-radius:50%;justify-content:center;width:36px;height:36px;margin-bottom:0;padding:0}.KNBqaW_dialog{width:min(960px,100%)}.KNBqaW_dialogBody{overflow:hidden}.KNBqaW_frame{box-sizing:border-box;background:var(--dsw-alias-bg-layer-2,#fff);border:0;width:100%;height:min(70vh,640px);min-height:360px;display:block}";
		const tagId = "dsh-token-usage-stats/client.js";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\"dsh-token-usage-stats/client.js\"]") === null) {
			const tag = document.createElement("style");
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var TokenUsageStatsAction_module_css_default = {
			"dialog": "KNBqaW_dialog",
			"dialogBody": "KNBqaW_dialogBody",
			"frame": "KNBqaW_frame",
			"label": "KNBqaW_label",
			"railOnly": "KNBqaW_railOnly",
			"root": "KNBqaW_root"
		};
		//#endregion
		//#region lib/types/client/TokenUsageStatsAction.js
		/** Minimal bar-chart glyph used on the collapsed sidebar rail. */
		function ChartGlyph({ size }) {
			return (0, import_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": true,
				children: [
					(0, import_jsx_runtime.jsx)("path", {
						d: "M2.5 13.5V9.5H4V13.5H2.5Z",
						fill: "currentColor"
					}),
					(0, import_jsx_runtime.jsx)("path", {
						d: "M6 13.5V5.5H7.5V13.5H6Z",
						fill: "currentColor"
					}),
					(0, import_jsx_runtime.jsx)("path", {
						d: "M9.5 13.5V7.5H11V13.5H9.5Z",
						fill: "currentColor"
					}),
					(0, import_jsx_runtime.jsx)("path", {
						d: "M13 13.5V3H14.5V13.5H13Z",
						fill: "currentColor"
					}),
					(0, import_jsx_runtime.jsx)("path", {
						d: "M1.5 14.5H15V16H1.5V14.5Z",
						fill: "currentColor"
					})
				]
			});
		}
		/**
		* Sidebar footer trigger for the token usage dashboard. Clicking opens an
		* in-page modal that embeds the host-served dashboard page, so desktop users
		* stay in the same application window.
		* @param props - footer slot share (wide/rail state) plus the namespace translator.
		* @returns the trigger button and the controlled modal.
		*/
		function TokenUsageStatsAction({ wide, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			const label = t("label");
			return (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: wide ? TokenUsageStatsAction_module_css_default.root : `${TokenUsageStatsAction_module_css_default.root} ${TokenUsageStatsAction_module_css_default.railOnly}`,
				"aria-label": t("open"),
				title: t("open"),
				onClick: () => {
					setOpen(true);
				},
				children: [(0, import_jsx_runtime.jsx)(ChartGlyph, { size: wide ? 14 : 18 }), wide ? (0, import_jsx_runtime.jsx)("span", {
					className: TokenUsageStatsAction_module_css_default.label,
					children: label
				}) : null]
			}), (0, import_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose: () => {
					setOpen(false);
				},
				title: t("dialogTitle"),
				closeLabel: t("close"),
				className: TokenUsageStatsAction_module_css_default.dialog ?? "",
				contentClassName: TokenUsageStatsAction_module_css_default.dialogBody ?? "",
				children: (0, import_jsx_runtime.jsx)("iframe", {
					src: "/token-usage-stats",
					title: t("dialogTitle"),
					className: TokenUsageStatsAction_module_css_default.frame
				})
			})] });
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `usageStats` namespace dictionaries. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "usageStats";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			label: "用量统计",
			open: "打开 Token 用量统计面板",
			close: "关闭",
			dialogTitle: "Token 用量统计"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			label: "Usage",
			open: "Open token usage dashboard",
			close: "Close",
			dialogTitle: "Token usage"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Required services for locale registration and the sidebar footer slot. */
		const inject = ["slots", "locale"];
		/**
		* Client plugin body: register the dictionaries and the footer action.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-token-usage-stats: dictionaries");
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "token-usage-stats",
				order: 10,
				locale: NS
			}, TokenUsageStatsAction));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map