import type { Theme } from "../schema/types";
export declare const modernDarkTheme: Theme;
export declare const cleanLightTheme: Theme;
export declare const glassPanelTheme: Theme;
export declare const minimalWallTheme: Theme;
export declare const themePresets: readonly [Theme, Theme, Theme, Theme];
export declare function ensureThemePresets(themes: Theme[]): Theme[];
