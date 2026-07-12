"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATE_EXPORT_FORMAT = void 0;
exports.importDashboardProject = importDashboardProject;
exports.exportTemplate = exportTemplate;
exports.importTemplate = importTemplate;
exports.createPageTemplate = createPageTemplate;
exports.applyPageTemplate = applyPageTemplate;
exports.collectMissingStateIds = collectMissingStateIds;
exports.markMissingStates = markMissingStates;
exports.remapDashboardStates = remapDashboardStates;
const evaluator_1 = require("./formulas/evaluator");
const defaults_1 = require("./schema/defaults");
const migrations_1 = require("./schema/migrations");
const validation_1 = require("./schema/validation");
exports.TEMPLATE_EXPORT_FORMAT = "ioBroker.dashboard-ng/template";
function importDashboardProject(input, availableStateIds = []) {
    const migration = (0, migrations_1.migrateDashboardProject)(input);
    const project = markMissingStates(migration.project, availableStateIds);
    return {
        project,
        missingStateIds: collectMissingStateIds(project, availableStateIds),
        migrated: migration.migrated,
    };
}
function exportTemplate(template) {
    return { format: exports.TEMPLATE_EXPORT_FORMAT, version: 1, template: clone(template) };
}
function importTemplate(input) {
    if (!isRecord(input) || input.format !== exports.TEMPLATE_EXPORT_FORMAT || input.version !== 1) {
        throw new Error("Unsupported template file.");
    }
    const template = input.template;
    if (!isRecord(template) ||
        typeof template.templateId !== "string" ||
        typeof template.name !== "string" ||
        template.kind !== "page" ||
        !Array.isArray(template.componentIds) ||
        !isRecord(template.page) ||
        !Array.isArray(template.components)) {
        throw new Error("Template file is incomplete or invalid.");
    }
    const imported = clone(template);
    const project = (0, defaults_1.createDefaultDashboard)();
    project.pages = [clone(imported.page)];
    project.components = clone(imported.components ?? []);
    project.bindings = clone(imported.bindings ?? []);
    project.actions = clone(imported.actions ?? []);
    project.templates = [imported];
    project.settings.activePageId = imported.page.pageId;
    const validation = (0, validation_1.validateDashboardProject)(project);
    if (!validation.valid) {
        const issue = validation.issues.find((item) => item.severity === "error");
        throw new Error(`Invalid template: ${issue?.path ?? "$"} ${issue?.message ?? "validation failed"}`);
    }
    return imported;
}
function createPageTemplate(project, pageId, name) {
    const page = project.pages.find((candidate) => candidate.pageId === pageId);
    if (!page) {
        throw new Error("Page not found.");
    }
    const componentIds = new Set(page.componentIds);
    const components = project.components.filter((component) => componentIds.has(component.componentId));
    const bindingIds = new Set(components.flatMap((component) => component.bindingIds));
    const actionIds = new Set(components.flatMap((component) => component.actionIds));
    return {
        templateId: createId("tpl"),
        name: name.trim() || `${page.name} Template`,
        kind: "page",
        componentIds: [...page.componentIds],
        page: clone(page),
        components: clone(components),
        bindings: clone(project.bindings.filter((binding) => bindingIds.has(binding.bindingId))),
        actions: clone(project.actions.filter((action) => actionIds.has(action.actionId))),
        metadata: {
            description: `Saved from ${page.name}`,
            createdAt: new Date().toISOString(),
        },
    };
}
function applyPageTemplate(project, template) {
    if (template.kind !== "page" || !template.page || !template.components) {
        throw new Error("Only complete page templates can be applied.");
    }
    const next = clone(project);
    const pageId = createId("page");
    const componentMap = new Map(template.components.map((item) => [item.componentId, createId("cmp")]));
    const bindingMap = new Map((template.bindings ?? []).map((item) => [item.bindingId, createId("bind")]));
    const actionMap = new Map((template.actions ?? []).map((item) => [item.actionId, createId("act")]));
    const page = {
        ...clone(template.page),
        pageId,
        name: uniquePageName(next, template.name),
        order: next.pages.length,
        componentIds: template.components.map((item) => componentMap.get(item.componentId)),
    };
    const components = template.components.map((item) => {
        const parentId = item.parentId ? componentMap.get(item.parentId) : undefined;
        return {
            ...clone(item),
            componentId: componentMap.get(item.componentId),
            pageId,
            ...(parentId ? { parentId } : {}),
            bindingIds: item.bindingIds.map((id) => bindingMap.get(id)).filter(isString),
            actionIds: item.actionIds.map((id) => actionMap.get(id)).filter(isString),
        };
    });
    const actions = (template.actions ?? []).map((item) => ({
        ...clone(item),
        actionId: actionMap.get(item.actionId),
        componentId: componentMap.get(item.componentId),
        steps: remapNavigation(item.steps, template.page.pageId, pageId),
        ...(item.elseSteps
            ? { elseSteps: remapNavigation(item.elseSteps, template.page.pageId, pageId) }
            : {}),
    }));
    next.pages.push(page);
    next.components.push(...components);
    next.bindings.push(...(template.bindings ?? []).map((item) => ({
        ...clone(item),
        bindingId: bindingMap.get(item.bindingId),
        componentId: componentMap.get(item.componentId),
    })));
    next.actions.push(...actions);
    next.settings.activePageId = pageId;
    next.updatedAt = new Date().toISOString();
    return next;
}
function collectMissingStateIds(project, availableStateIds) {
    const available = new Set(availableStateIds);
    if (!available.size) {
        return [];
    }
    return collectReferencedStateIds(project).filter((id) => !available.has(id));
}
function markMissingStates(project, availableStateIds) {
    const next = clone(project);
    const available = new Set(availableStateIds);
    if (!available.size) {
        return next;
    }
    next.bindings = next.bindings.map((binding) => {
        const ids = [
            ...(binding.stateId ? [binding.stateId] : []),
            ...formulaIds(binding.formula),
            ...formulaIds(binding.transform?.formula),
        ];
        return { ...binding, missing: ids.some((id) => !available.has(id)) };
    });
    return next;
}
function remapDashboardStates(project, mapping) {
    const next = clone(project);
    const mapId = (id) => mapping[id] || id;
    next.bindings.forEach((binding) => {
        if (binding.stateId)
            binding.stateId = mapId(binding.stateId);
        if (binding.formula)
            binding.formula = remapFormula(binding.formula, mapping);
        if (binding.transform?.formula)
            binding.transform.formula = remapFormula(binding.transform.formula, mapping);
        binding.missing = false;
    });
    next.components.forEach((component) => {
        if (component.visibility.formula)
            component.visibility.formula = remapFormula(component.visibility.formula, mapping);
        const conditional = component.style.conditional;
        if (isRecord(conditional) && typeof conditional.formula === "string") {
            conditional.formula = remapFormula(conditional.formula, mapping);
        }
    });
    next.actions.forEach((action) => {
        if (action.condition?.stateId)
            action.condition.stateId = mapId(action.condition.stateId);
        if (action.condition?.formula)
            action.condition.formula = remapFormula(action.condition.formula, mapping);
        remapSteps(action.steps, mapId);
        if (action.elseSteps)
            remapSteps(action.elseSteps, mapId);
    });
    next.updatedAt = new Date().toISOString();
    return next;
}
function collectReferencedStateIds(project) {
    const ids = new Set();
    const add = (id) => id && ids.add(id);
    const addFormula = (formula) => formulaIds(formula).forEach((id) => ids.add(id));
    project.bindings.forEach((binding) => {
        add(binding.stateId);
        addFormula(binding.formula);
        addFormula(binding.transform?.formula);
    });
    project.components.forEach((component) => {
        addFormula(component.visibility.formula);
        const conditional = component.style.conditional;
        if (isRecord(conditional) && typeof conditional.formula === "string")
            addFormula(conditional.formula);
    });
    project.actions.forEach((action) => {
        add(action.condition?.stateId);
        addFormula(action.condition?.formula);
        [...action.steps, ...(action.elseSteps ?? [])].forEach((step) => {
            if (step.kind === "setState" || step.kind === "toggleState" || step.kind === "runScene")
                add(step.stateId);
        });
    });
    return [...ids].sort();
}
function formulaIds(formula) {
    if (!formula?.trim())
        return [];
    try {
        return (0, evaluator_1.getFormulaStateIds)(formula);
    }
    catch {
        return [];
    }
}
function remapFormula(formula, mapping) {
    return formula.replace(/state\(\s*(["'])(.*?)\1\s*\)/g, (match, quote, id) => mapping[id] ? `state(${quote}${mapping[id]}${quote})` : match);
}
function remapSteps(steps, mapId) {
    steps.forEach((step) => {
        if (step.kind === "setState" || step.kind === "toggleState" || step.kind === "runScene")
            step.stateId = mapId(step.stateId);
    });
}
function remapNavigation(steps, oldPageId, pageId) {
    return clone(steps).map((step) => step.kind === "navigate" && step.pageId === oldPageId ? { ...step, pageId } : step);
}
function uniquePageName(project, base) {
    const names = new Set(project.pages.map((page) => page.name.toLowerCase()));
    if (!names.has(base.toLowerCase()))
        return base;
    let index = 2;
    while (names.has(`${base} ${index}`.toLowerCase()))
        index += 1;
    return `${base} ${index}`;
}
function createId(prefix) {
    return `${prefix}-${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}`;
}
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isString(value) {
    return Boolean(value);
}
//# sourceMappingURL=portable.js.map