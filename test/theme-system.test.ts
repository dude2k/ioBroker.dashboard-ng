import { describe, expect, it } from "vitest";
import {
  cleanLightTheme,
  ensureThemePresets,
  modernDarkTheme,
  themeCssVariables,
  themePresets,
} from "../packages/shared/src";

describe("theme system", () => {
  it("exposes every runtime design token as a CSS variable", () => {
    const variables = themeCssVariables(cleanLightTheme);

    expect(variables["--app-bg"]).toBe(cleanLightTheme.tokens.colors.background);
    expect(variables["--accent"]).toBe(cleanLightTheme.tokens.colors.accent);
    expect(variables["--card-padding"]).toBe("16px");
    expect(variables["--radius-medium"]).toBe("8px");
    expect(variables["--card-shadow"]).toBe(cleanLightTheme.tokens.shadow.card);
  });

  it("adds only missing built-in presets without changing existing themes", () => {
    const existing = [{ ...modernDarkTheme, name: "My Dark" }];
    const result = ensureThemePresets(existing);

    expect(result).toHaveLength(themePresets.length);
    expect(result[0]?.name).toBe("My Dark");
    expect(result.map((theme) => theme.themeId)).toEqual(
      themePresets.map((theme) => theme.themeId),
    );
  });
});
