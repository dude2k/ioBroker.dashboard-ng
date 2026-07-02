"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultDashboard = createDefaultDashboard;
const types_1 = require("./types");
const catalog_1 = require("../components/catalog");
const presets_1 = require("../themes/presets");
const defaultLayout = {
    layoutId: "default",
    columns: 12,
    rowHeight: 40,
    gap: 12,
    breakpoints: {
        phone: 4,
        tablet: 8,
        desktop: 12,
        wall: 12,
    },
};
function createDefaultDashboard(options = {}) {
    const now = options.now ?? new Date().toISOString();
    const page = {
        pageId: "page-home",
        name: "Home",
        icon: "House",
        order: 0,
        componentIds: ["cmp-light-main", "cmp-sensor-temp", "cmp-scene-evening"],
        settings: {
            kiosk: true,
        },
    };
    const lightPlacement = { x: 0, y: 0, w: 3, h: 3 };
    const sensorPlacement = { x: 3, y: 0, w: 3, h: 2 };
    const scenePlacement = { x: 6, y: 0, w: 2, h: 2 };
    const light = (0, catalog_1.createComponentFromCatalog)("light-card", "cmp-light-main", page.pageId, lightPlacement);
    const sensor = (0, catalog_1.createComponentFromCatalog)("sensor-card", "cmp-sensor-temp", page.pageId, sensorPlacement);
    const scene = (0, catalog_1.createComponentFromCatalog)("scene-button", "cmp-scene-evening", page.pageId, scenePlacement);
    light.props = { ...light.props, title: "Living Light", subtitle: "alias.0.living.light" };
    sensor.props = { ...sensor.props, title: "Temperature", unit: "C", precision: 1 };
    scene.props = { ...scene.props, title: "Evening", value: true };
    const lightBinding = {
        bindingId: "bind-light-main",
        componentId: light.componentId,
        target: "value",
        kind: "state",
        mode: "readwrite",
        stateId: "alias.0.living.light",
        missing: true,
    };
    const sensorBinding = {
        bindingId: "bind-sensor-temp",
        componentId: sensor.componentId,
        target: "value",
        kind: "state",
        mode: "read",
        stateId: "alias.0.living.temperature",
        missing: true,
    };
    const bindings = [lightBinding, sensorBinding];
    light.bindingIds = [lightBinding.bindingId];
    sensor.bindingIds = [sensorBinding.bindingId];
    const actions = [
        {
            actionId: "act-light-toggle",
            componentId: light.componentId,
            trigger: "tap",
            steps: [
                {
                    kind: "toggleState",
                    stateId: "alias.0.living.light",
                },
            ],
        },
        {
            actionId: "act-scene-evening",
            componentId: scene.componentId,
            trigger: "tap",
            steps: [
                {
                    kind: "setState",
                    stateId: "alias.0.scene.evening",
                    value: true,
                },
            ],
        },
    ];
    light.actionIds = ["act-light-toggle"];
    scene.actionIds = ["act-scene-evening"];
    return {
        schemaVersion: types_1.CURRENT_SCHEMA_VERSION,
        projectId: options.projectId ?? "default",
        name: options.name ?? "My Home",
        pages: [page],
        layouts: {
            default: defaultLayout,
        },
        components: [light, sensor, scene],
        bindings,
        actions,
        themes: [presets_1.modernDarkTheme, presets_1.cleanLightTheme],
        assets: [],
        templates: createStarterTemplates(now),
        settings: {
            activeThemeId: presets_1.modernDarkTheme.themeId,
            activePageId: page.pageId,
            kiosk: true,
            burnInProtection: true,
            wakeLock: true,
            advancedMode: false,
        },
        createdAt: now,
        updatedAt: now,
        migrationHistory: [],
    };
}
function createStarterTemplates(now) {
    return [
        {
            templateId: "tpl-wall-overview",
            name: "Wall Overview",
            kind: "page",
            componentIds: [],
            metadata: {
                description: "Starter template for a wall tablet overview.",
                createdAt: now,
            },
        },
        {
            templateId: "tpl-mobile-status",
            name: "Mobile Status",
            kind: "page",
            componentIds: [],
            metadata: {
                description: "Starter template for compact mobile status views.",
                createdAt: now,
            },
        },
    ];
}
//# sourceMappingURL=defaults.js.map