"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.themePresets = exports.minimalWallTheme = exports.glassPanelTheme = exports.cleanLightTheme = exports.modernDarkTheme = void 0;
exports.ensureThemePresets = ensureThemePresets;
exports.modernDarkTheme = {
    themeId: "modern-dark",
    name: "Modern Dark",
    mode: "dark",
    tokens: {
        colors: {
            background: "#0f172a",
            surface: "#172033",
            surfaceElevated: "#202b3f",
            text: "#f8fafc",
            mutedText: "#a7b0c0",
            accent: "#14b8a6",
            accentText: "#052e2b",
            success: "#22c55e",
            warning: "#f59e0b",
            danger: "#ef4444",
            border: "#2e3a52",
        },
        typography: {
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
            baseSize: 15,
            scale: 1.18,
        },
        spacing: {
            unit: 8,
            pagePadding: 20,
            cardPadding: 16,
        },
        radius: {
            small: 6,
            medium: 8,
            large: 8,
        },
        shadow: {
            card: "0 14px 32px rgba(0, 0, 0, 0.24)",
            elevated: "0 20px 50px rgba(0, 0, 0, 0.32)",
        },
        blur: {
            panel: 12,
        },
        border: {
            width: 1,
        },
    },
};
exports.cleanLightTheme = {
    themeId: "clean-light",
    name: "Clean Light",
    mode: "light",
    tokens: {
        colors: {
            background: "#f6f8fb",
            surface: "#ffffff",
            surfaceElevated: "#f1f5f9",
            text: "#172033",
            mutedText: "#64748b",
            accent: "#2563eb",
            accentText: "#ffffff",
            success: "#16a34a",
            warning: "#d97706",
            danger: "#dc2626",
            border: "#d7dee8",
        },
        typography: {
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
            baseSize: 15,
            scale: 1.18,
        },
        spacing: {
            unit: 8,
            pagePadding: 20,
            cardPadding: 16,
        },
        radius: {
            small: 6,
            medium: 8,
            large: 8,
        },
        shadow: {
            card: "0 12px 28px rgba(37, 99, 235, 0.12)",
            elevated: "0 18px 44px rgba(15, 23, 42, 0.14)",
        },
        blur: {
            panel: 8,
        },
        border: {
            width: 1,
        },
    },
};
exports.glassPanelTheme = {
    themeId: "glass-panel",
    name: "Glass Panel",
    mode: "dark",
    tokens: {
        colors: {
            background: "#152033",
            surface: "#22314b",
            surfaceElevated: "#304364",
            text: "#f4f8ff",
            mutedText: "#b1c0d8",
            accent: "#5eead4",
            accentText: "#073b38",
            success: "#4ade80",
            warning: "#fbbf24",
            danger: "#fb7185",
            border: "#58708f",
        },
        typography: {
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
            baseSize: 15,
            scale: 1.18,
        },
        spacing: { unit: 8, pagePadding: 20, cardPadding: 16 },
        radius: { small: 6, medium: 10, large: 14 },
        shadow: {
            card: "0 16px 34px rgba(4, 12, 26, 0.3)",
            elevated: "0 24px 56px rgba(4, 12, 26, 0.42)",
        },
        blur: { panel: 16 },
        border: { width: 1 },
    },
};
exports.minimalWallTheme = {
    themeId: "minimal-wall",
    name: "Minimal Wall Tablet",
    mode: "light",
    tokens: {
        colors: {
            background: "#f5f7f8",
            surface: "#ffffff",
            surfaceElevated: "#e8edef",
            text: "#182126",
            mutedText: "#66747d",
            accent: "#0f766e",
            accentText: "#ffffff",
            success: "#15803d",
            warning: "#b45309",
            danger: "#b91c1c",
            border: "#d3dce0",
        },
        typography: {
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
            baseSize: 16,
            scale: 1.16,
        },
        spacing: { unit: 8, pagePadding: 24, cardPadding: 18 },
        radius: { small: 4, medium: 6, large: 8 },
        shadow: {
            card: "0 4px 12px rgba(24, 33, 38, 0.08)",
            elevated: "0 10px 28px rgba(24, 33, 38, 0.12)",
        },
        blur: { panel: 0 },
        border: { width: 1 },
    },
};
exports.themePresets = [
    exports.modernDarkTheme,
    exports.cleanLightTheme,
    exports.glassPanelTheme,
    exports.minimalWallTheme,
];
function ensureThemePresets(themes) {
    const known = new Set(themes.map((theme) => theme.themeId));
    const missing = exports.themePresets.filter((theme) => !known.has(theme.themeId));
    return missing.length ? [...themes, ...missing.map((theme) => structuredClone(theme))] : themes;
}
//# sourceMappingURL=presets.js.map