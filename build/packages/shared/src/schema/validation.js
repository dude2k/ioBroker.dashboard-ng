"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDashboardProject = validateDashboardProject;
const types_1 = require("./types");
function validateDashboardProject(project) {
    const issues = [];
    if (!isRecord(project)) {
        return {
            valid: false,
            issues: [{ path: "$", message: "Dashboard project must be an object.", severity: "error" }],
        };
    }
    if (project.schemaVersion !== types_1.CURRENT_SCHEMA_VERSION) {
        issues.push({
            path: "$.schemaVersion",
            message: `Expected schema version ${types_1.CURRENT_SCHEMA_VERSION}.`,
            severity: "error",
        });
    }
    requireString(project, "projectId", "$.projectId", issues);
    requireString(project, "name", "$.name", issues);
    requireArray(project, "pages", "$.pages", issues);
    requireArray(project, "components", "$.components", issues);
    requireArray(project, "bindings", "$.bindings", issues);
    requireArray(project, "actions", "$.actions", issues);
    requireArray(project, "themes", "$.themes", issues);
    requireArray(project, "assets", "$.assets", issues);
    requireArray(project, "templates", "$.templates", issues);
    requireString(project, "createdAt", "$.createdAt", issues);
    requireString(project, "updatedAt", "$.updatedAt", issues);
    if (!isRecord(project.layouts)) {
        issues.push({ path: "$.layouts", message: "Layouts must be an object.", severity: "error" });
    }
    if (!isRecord(project.settings)) {
        issues.push({ path: "$.settings", message: "Settings must be an object.", severity: "error" });
    }
    if (issues.some((issue) => issue.severity === "error")) {
        return { valid: false, issues };
    }
    const typedProject = project;
    validateReferences(typedProject, issues);
    validateLayouts(typedProject, issues);
    return {
        valid: !issues.some((issue) => issue.severity === "error"),
        issues,
    };
}
function validateReferences(project, issues) {
    const pageIds = new Set(project.pages.map((page) => page.pageId));
    const componentIds = new Set(project.components.map((component) => component.componentId));
    const bindingIds = new Set(project.bindings.map((binding) => binding.bindingId));
    const actionIds = new Set(project.actions.map((action) => action.actionId));
    detectDuplicates(project.pages, (page) => page.pageId, "$.pages", issues);
    detectDuplicates(project.components, (component) => component.componentId, "$.components", issues);
    detectDuplicates(project.bindings, (binding) => binding.bindingId, "$.bindings", issues);
    detectDuplicates(project.actions, (action) => action.actionId, "$.actions", issues);
    project.pages.forEach((page, pageIndex) => {
        page.componentIds.forEach((componentId, componentIndex) => {
            if (!componentIds.has(componentId)) {
                issues.push({
                    path: `$.pages[${pageIndex}].componentIds[${componentIndex}]`,
                    message: `Missing component ${componentId}.`,
                    severity: "error",
                });
            }
        });
    });
    project.components.forEach((component, componentIndex) => {
        if (!pageIds.has(component.pageId)) {
            issues.push({
                path: `$.components[${componentIndex}].pageId`,
                message: `Missing page ${component.pageId}.`,
                severity: "error",
            });
        }
        component.bindingIds.forEach((bindingId, bindingIndex) => {
            if (!bindingIds.has(bindingId)) {
                issues.push({
                    path: `$.components[${componentIndex}].bindingIds[${bindingIndex}]`,
                    message: `Missing binding ${bindingId}.`,
                    severity: "error",
                });
            }
        });
        component.actionIds.forEach((actionId, actionIndex) => {
            if (!actionIds.has(actionId)) {
                issues.push({
                    path: `$.components[${componentIndex}].actionIds[${actionIndex}]`,
                    message: `Missing action ${actionId}.`,
                    severity: "error",
                });
            }
        });
    });
    project.bindings.forEach((binding, bindingIndex) => {
        if (!componentIds.has(binding.componentId)) {
            issues.push({
                path: `$.bindings[${bindingIndex}].componentId`,
                message: `Missing component ${binding.componentId}.`,
                severity: "error",
            });
        }
    });
    project.actions.forEach((action, actionIndex) => {
        if (!componentIds.has(action.componentId)) {
            issues.push({
                path: `$.actions[${actionIndex}].componentId`,
                message: `Missing component ${action.componentId}.`,
                severity: "error",
            });
        }
    });
}
function validateLayouts(project, issues) {
    Object.entries(project.layouts).forEach(([layoutId, layout]) => {
        if (layout.columns < 1) {
            issues.push({
                path: `$.layouts.${layoutId}.columns`,
                message: "Layout columns must be positive.",
                severity: "error",
            });
        }
        if (layout.rowHeight < 1) {
            issues.push({
                path: `$.layouts.${layoutId}.rowHeight`,
                message: "Layout row height must be positive.",
                severity: "error",
            });
        }
    });
    project.components.forEach((component, componentIndex) => {
        Object.entries(component.layout).forEach(([breakpoint, placement]) => {
            if (!isValidPlacement(placement)) {
                issues.push({
                    path: `$.components[${componentIndex}].layout.${breakpoint}`,
                    message: "Component placement must use non-negative x/y and positive w/h.",
                    severity: "error",
                });
            }
        });
    });
}
function isValidPlacement(placement) {
    return Boolean(placement &&
        Number.isInteger(placement.x) &&
        Number.isInteger(placement.y) &&
        Number.isInteger(placement.w) &&
        Number.isInteger(placement.h) &&
        placement.x >= 0 &&
        placement.y >= 0 &&
        placement.w > 0 &&
        placement.h > 0);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function requireString(record, key, path, issues) {
    if (typeof record[key] !== "string" || record[key] === "") {
        issues.push({ path, message: `${key} must be a non-empty string.`, severity: "error" });
    }
}
function requireArray(record, key, path, issues) {
    if (!Array.isArray(record[key])) {
        issues.push({ path, message: `${key} must be an array.`, severity: "error" });
    }
}
function detectDuplicates(items, getId, path, issues) {
    const seen = new Set();
    items.forEach((item, index) => {
        const id = getId(item);
        if (seen.has(id)) {
            issues.push({
                path: `${path}[${index}]`,
                message: `Duplicate id ${id}.`,
                severity: "error",
            });
        }
        seen.add(id);
    });
}
//# sourceMappingURL=validation.js.map