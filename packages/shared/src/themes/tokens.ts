import type { Theme } from "../schema/types";

export function themeCssVariables(theme: Theme): Record<string, string> {
  const { colors, typography, spacing, radius, shadow, blur, border } = theme.tokens;
  return {
    "--app-bg": colors.background,
    "--bg": colors.background,
    "--panel": colors.surface,
    "--surface": colors.surface,
    "--panel-strong": colors.surfaceElevated,
    "--surface-2": colors.surfaceElevated,
    "--text": colors.text,
    "--muted": colors.mutedText,
    "--border": colors.border,
    "--accent": colors.accent,
    "--accent-2": colors.success,
    "--warn": colors.warning,
    "--danger": colors.danger,
    "--success": colors.success,
    "--font-family": typography.fontFamily,
    "--base-size": `${typography.baseSize}px`,
    "--type-scale": String(typography.scale),
    "--space-unit": `${spacing.unit}px`,
    "--page-padding": `${spacing.pagePadding}px`,
    "--card-padding": `${spacing.cardPadding}px`,
    "--radius-small": `${radius.small}px`,
    "--radius-medium": `${radius.medium}px`,
    "--radius-large": `${radius.large}px`,
    "--card-shadow": shadow.card,
    "--elevated-shadow": shadow.elevated,
    "--panel-blur": `${blur.panel}px`,
    "--border-width": `${border.width}px`,
  };
}
