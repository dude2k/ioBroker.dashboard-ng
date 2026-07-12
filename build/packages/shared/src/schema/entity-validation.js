"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDashboardEntityShapes = validateDashboardEntityShapes;
function validateDashboardEntityShapes(project, issues) {
    validateArray(project.pages, "$.pages", issues, validatePage);
    validateRecordEntries(project.layouts, "$.layouts", issues, validateLayout);
    validateArray(project.components, "$.components", issues, validateComponent);
    validateArray(project.bindings, "$.bindings", issues, validateBinding);
    validateArray(project.actions, "$.actions", issues, validateAction);
    validateArray(project.themes, "$.themes", issues, validateTheme);
    validateArray(project.assets, "$.assets", issues, validateAsset);
    validateArray(project.templates, "$.templates", issues, validateTemplate);
    validateSettings(project.settings, "$.settings", issues);
    validateArray(project.migrationHistory, "$.migrationHistory", issues, validateMigrationEntry);
}
function validatePage(value, path, issues) {
    const page = requireShape(value, path, {
        pageId: "string",
        name: "string",
        order: "number",
        componentIds: "array",
        settings: "record",
    }, issues);
    if (page) {
        requireStringArray(page.componentIds, `${path}.componentIds`, issues);
    }
}
function validateLayout(value, path, issues) {
    const layout = requireShape(value, path, {
        layoutId: "string",
        columns: "number",
        rowHeight: "number",
        gap: "number",
        breakpoints: "record",
    }, issues);
    if (!layout || !isRecord(layout.breakpoints)) {
        return;
    }
    ["phone", "tablet", "desktop", "wall"].forEach((key) => requireType(layout.breakpoints, key, "number", `${path}.breakpoints`, issues));
}
function validateComponent(value, path, issues) {
    const component = requireShape(value, path, {
        componentId: "string",
        type: "string",
        pageId: "string",
        name: "string",
        props: "record",
        style: "record",
        layout: "record",
        bindingIds: "array",
        actionIds: "array",
        visibility: "record",
    }, issues);
    if (!component) {
        return;
    }
    requireStringArray(component.bindingIds, `${path}.bindingIds`, issues);
    requireStringArray(component.actionIds, `${path}.actionIds`, issues);
    const visibility = requireShape(component.visibility, `${path}.visibility`, { kind: "string" }, issues);
    if (visibility && !["always", "binding", "formula"].includes(String(visibility.kind))) {
        addIssue(`${path}.visibility.kind`, "Unsupported visibility kind.", issues);
    }
}
function validateBinding(value, path, issues) {
    const binding = requireShape(value, path, {
        bindingId: "string",
        componentId: "string",
        target: "string",
        kind: "string",
        mode: "string",
        missing: "boolean",
    }, issues);
    if (!binding) {
        return;
    }
    if (!["state", "formula"].includes(String(binding.kind))) {
        addIssue(`${path}.kind`, "Unsupported binding kind.", issues);
    }
    if (!["read", "write", "readwrite"].includes(String(binding.mode))) {
        addIssue(`${path}.mode`, "Unsupported binding mode.", issues);
    }
    optionalString(binding, "stateId", path, issues);
    optionalString(binding, "formula", path, issues);
    if (binding.transform !== undefined && !isRecord(binding.transform)) {
        addIssue(`${path}.transform`, "transform must be an object.", issues);
    }
}
function validateAction(value, path, issues) {
    const action = requireShape(value, path, { actionId: "string", componentId: "string", trigger: "string", steps: "array" }, issues);
    if (!action) {
        return;
    }
    if (!["tap", "longPress", "swipe"].includes(String(action.trigger))) {
        addIssue(`${path}.trigger`, "Unsupported action trigger.", issues);
    }
    validateArray(action.steps, `${path}.steps`, issues, validateActionStep);
    if (action.elseSteps !== undefined) {
        validateArray(action.elseSteps, `${path}.elseSteps`, issues, validateActionStep);
    }
    if (action.condition !== undefined) {
        const condition = requireShape(action.condition, `${path}.condition`, { kind: "string" }, issues);
        if (condition) {
            optionalString(condition, "stateId", `${path}.condition`, issues);
            optionalString(condition, "formula", `${path}.condition`, issues);
        }
    }
}
function validateActionStep(value, path, issues) {
    const step = requireShape(value, path, { kind: "string" }, issues);
    if (!step) {
        return;
    }
    if (["setState", "toggleState", "runScene"].includes(String(step.kind))) {
        requireType(step, "stateId", "string", path, issues);
    }
    else if (step.kind === "navigate") {
        requireType(step, "pageId", "string", path, issues);
    }
    else if (step.kind === "openUrl") {
        requireType(step, "url", "string", path, issues);
        requireType(step, "newWindow", "boolean", path, issues);
    }
    else {
        addIssue(`${path}.kind`, "Unsupported action step.", issues);
    }
}
function validateTheme(value, path, issues) {
    const theme = requireShape(value, path, { themeId: "string", name: "string", mode: "string", tokens: "record" }, issues);
    if (!theme || !isRecord(theme.tokens)) {
        return;
    }
    if (!["dark", "light"].includes(String(theme.mode))) {
        addIssue(`${path}.mode`, "Unsupported theme mode.", issues);
    }
    const tokenGroups = {
        colors: "record",
        typography: "record",
        spacing: "record",
        radius: "record",
        shadow: "record",
        blur: "record",
        border: "record",
    };
    requireShape(theme.tokens, `${path}.tokens`, tokenGroups, issues);
}
function validateAsset(value, path, issues) {
    const asset = requireShape(value, path, { assetId: "string", name: "string", kind: "string", createdAt: "string" }, issues);
    if (!asset) {
        return;
    }
    if (!["image", "icon", "background", "other"].includes(String(asset.kind))) {
        addIssue(`${path}.kind`, "Unsupported asset kind.", issues);
    }
    optionalString(asset, "mimeType", path, issues);
    optionalString(asset, "url", path, issues);
    optionalString(asset, "storagePath", path, issues);
}
function validateTemplate(value, path, issues) {
    const template = requireShape(value, path, {
        templateId: "string",
        name: "string",
        kind: "string",
        componentIds: "array",
        metadata: "record",
    }, issues);
    if (!template) {
        return;
    }
    requireStringArray(template.componentIds, `${path}.componentIds`, issues);
    if (!["page", "section", "componentGroup"].includes(String(template.kind))) {
        addIssue(`${path}.kind`, "Unsupported template kind.", issues);
    }
    if (isRecord(template.metadata)) {
        Object.entries(template.metadata).forEach(([key, item]) => {
            if (typeof item !== "string") {
                addIssue(`${path}.metadata.${key}`, "Template metadata values must be strings.", issues);
            }
        });
    }
    if (template.page !== undefined) {
        validatePage(template.page, `${path}.page`, issues);
    }
    if (template.components !== undefined) {
        validateArray(template.components, `${path}.components`, issues, validateComponent);
    }
    if (template.bindings !== undefined) {
        validateArray(template.bindings, `${path}.bindings`, issues, validateBinding);
    }
    if (template.actions !== undefined) {
        validateArray(template.actions, `${path}.actions`, issues, validateAction);
    }
}
function validateSettings(value, path, issues) {
    const settings = requireShape(value, path, {
        activeThemeId: "string",
        activePageId: "string",
        kiosk: "boolean",
        burnInProtection: "boolean",
        wakeLock: "boolean",
        advancedMode: "boolean",
        reconnectIntervalMs: "number",
    }, issues);
    if (settings &&
        (Number(settings.reconnectIntervalMs) < 500 || Number(settings.reconnectIntervalMs) > 60000)) {
        addIssue(`${path}.reconnectIntervalMs`, "Reconnect interval must be between 500 and 60000 ms.", issues);
    }
}
function validateMigrationEntry(value, path, issues) {
    requireShape(value, path, { fromVersion: "number", toVersion: "number", migratedAt: "string", note: "string" }, issues);
}
function validateArray(value, path, issues, validate) {
    if (!Array.isArray(value)) {
        return;
    }
    value.forEach((item, index) => validate(item, `${path}[${index}]`, issues));
}
function validateRecordEntries(value, path, issues, validate) {
    if (!isRecord(value)) {
        return;
    }
    Object.entries(value).forEach(([key, item]) => validate(item, `${path}.${key}`, issues));
}
function requireShape(value, path, shape, issues) {
    if (!isRecord(value)) {
        addIssue(path, "Expected an object.", issues);
        return undefined;
    }
    Object.entries(shape).forEach(([key, type]) => requireType(value, key, type, path, issues));
    return value;
}
function requireType(record, key, type, path, issues) {
    const value = record[key];
    const valid = type === "array"
        ? Array.isArray(value)
        : type === "record"
            ? isRecord(value)
            : typeof value === type && (type !== "string" || value !== "");
    if (!valid) {
        addIssue(`${path}.${key}`, `${key} must be a ${type}.`, issues);
    }
}
function requireStringArray(value, path, issues) {
    if (Array.isArray(value) && value.some((item) => typeof item !== "string" || !item)) {
        addIssue(path, "Expected non-empty string IDs.", issues);
    }
}
function optionalString(record, key, path, issues) {
    if (record[key] !== undefined && typeof record[key] !== "string") {
        addIssue(`${path}.${key}`, `${key} must be a string.`, issues);
    }
}
function addIssue(path, message, issues) {
    issues.push({ path, message, severity: "error" });
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=entity-validation.js.map