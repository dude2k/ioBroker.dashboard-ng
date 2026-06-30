import type { Theme } from "../schema/types";

export const modernDarkTheme: Theme = {
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
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
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

export const cleanLightTheme: Theme = {
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
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
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

export const themePresets = [modernDarkTheme, cleanLightTheme] as const;
