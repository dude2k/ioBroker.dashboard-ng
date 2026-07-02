export declare const CURRENT_SCHEMA_VERSION = 1;
export type DashboardBreakpoint = "phone" | "tablet" | "desktop" | "wall";
export type ComponentType = "room-card" | "light-card" | "thermostat-card" | "blind-card" | "sensor-card" | "scene-button" | "energy-card" | "mini-chart-card" | "camera-card" | "text" | "container" | "button" | "value-display";
export type BindingKind = "state" | "formula";
export type BindingMode = "read" | "write" | "readwrite";
export type ActionTrigger = "tap" | "longPress" | "swipe";
export type ThemeMode = "dark" | "light";
export type StatePrimitive = string | number | boolean | null;
export interface GridPlacement {
    x: number;
    y: number;
    w: number;
    h: number;
}
export type ComponentLayout = Partial<Record<DashboardBreakpoint, GridPlacement>>;
export interface Layout {
    layoutId: string;
    columns: number;
    rowHeight: number;
    gap: number;
    breakpoints: Record<DashboardBreakpoint, number>;
}
export interface PageSettings {
    kiosk?: boolean;
    hideNavigation?: boolean;
}
export interface Page {
    pageId: string;
    name: string;
    icon?: string;
    order: number;
    componentIds: string[];
    settings: PageSettings;
}
export interface VisibilityRule {
    kind: "always" | "binding" | "formula";
    bindingId?: string;
    formula?: string;
    expected?: StatePrimitive;
}
export interface DashboardComponent {
    componentId: string;
    type: ComponentType;
    pageId: string;
    name: string;
    props: Record<string, unknown>;
    style: Record<string, unknown>;
    layout: ComponentLayout;
    bindingIds: string[];
    actionIds: string[];
    visibility: VisibilityRule;
}
export interface BindingTransform {
    formula?: string;
    format?: "raw" | "number" | "percent" | "temperature" | "power" | "energy";
    decimals?: number;
}
export interface Binding {
    bindingId: string;
    componentId: string;
    target: string;
    kind: BindingKind;
    mode: BindingMode;
    stateId?: string;
    formula?: string;
    transform?: BindingTransform;
    missing: boolean;
}
export interface ActionCondition {
    kind: "stateEquals" | "stateNotEquals" | "stateGreaterThan" | "stateLessThan" | "formula";
    stateId?: string;
    value?: StatePrimitive;
    formula?: string;
}
export type ActionStep = {
    kind: "setState";
    stateId: string;
    value: StatePrimitive;
} | {
    kind: "toggleState";
    stateId: string;
} | {
    kind: "navigate";
    pageId: string;
} | {
    kind: "openUrl";
    url: string;
    newWindow: boolean;
} | {
    kind: "runScene";
    stateId: string;
    value?: StatePrimitive;
};
export interface DashboardAction {
    actionId: string;
    componentId: string;
    trigger: ActionTrigger;
    condition?: ActionCondition;
    elseSteps?: ActionStep[];
    steps: ActionStep[];
}
export interface ThemeTokens {
    colors: {
        background: string;
        surface: string;
        surfaceElevated: string;
        text: string;
        mutedText: string;
        accent: string;
        accentText: string;
        success: string;
        warning: string;
        danger: string;
        border: string;
    };
    typography: {
        fontFamily: string;
        baseSize: number;
        scale: number;
    };
    spacing: {
        unit: number;
        pagePadding: number;
        cardPadding: number;
    };
    radius: {
        small: number;
        medium: number;
        large: number;
    };
    shadow: {
        card: string;
        elevated: string;
    };
    blur: {
        panel: number;
    };
    border: {
        width: number;
    };
}
export interface Theme {
    themeId: string;
    name: string;
    mode: ThemeMode;
    tokens: ThemeTokens;
}
export interface Asset {
    assetId: string;
    name: string;
    kind: "image" | "icon" | "background" | "other";
    mimeType?: string;
    url?: string;
    storagePath?: string;
    createdAt: string;
}
export interface Template {
    templateId: string;
    name: string;
    kind: "page" | "section" | "componentGroup";
    componentIds: string[];
    page?: Page;
    metadata: Record<string, string>;
}
export interface ProjectSettings {
    activeThemeId: string;
    activePageId: string;
    kiosk: boolean;
    burnInProtection: boolean;
    wakeLock: boolean;
    advancedMode: boolean;
}
export interface MigrationEntry {
    fromVersion: number;
    toVersion: number;
    migratedAt: string;
    note: string;
}
export interface DashboardProject {
    schemaVersion: number;
    projectId: string;
    name: string;
    pages: Page[];
    layouts: Record<string, Layout>;
    components: DashboardComponent[];
    bindings: Binding[];
    actions: DashboardAction[];
    themes: Theme[];
    assets: Asset[];
    templates: Template[];
    settings: ProjectSettings;
    createdAt: string;
    updatedAt: string;
    migrationHistory: MigrationEntry[];
}
export interface StateOption {
    id: string;
    name: string;
    type: "boolean" | "number" | "string" | "mixed" | "object" | "array" | "unknown";
    role?: string;
    unit?: string;
    min?: number;
    max?: number;
    read: boolean;
    write: boolean;
    room?: string;
    function?: string;
}
export interface StateSnapshot {
    id: string;
    value: StatePrimitive;
    ack?: boolean;
    q?: number;
    ts?: number;
    lc?: number;
    missing: boolean;
}
export interface ValidationIssue {
    path: string;
    message: string;
    severity: "error" | "warning";
}
export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
}
