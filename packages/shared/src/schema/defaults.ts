import type {
  Binding,
  DashboardAction,
  DashboardProject,
  GridPlacement,
  Page,
  Template,
} from "./types";
import { CURRENT_SCHEMA_VERSION } from "./types";
import { createComponentFromCatalog } from "../components/catalog";
import { cleanLightTheme, modernDarkTheme } from "../themes/presets";

export interface DefaultDashboardOptions {
  projectId?: string;
  name?: string;
  now?: string;
}

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

export function createDefaultDashboard(options: DefaultDashboardOptions = {}): DashboardProject {
  const now = options.now ?? new Date().toISOString();
  const page: Page = {
    pageId: "page-home",
    name: "Home",
    icon: "House",
    order: 0,
    componentIds: ["cmp-light-main", "cmp-sensor-temp", "cmp-scene-evening"],
    settings: {
      kiosk: true,
    },
  };

  const lightPlacement: GridPlacement = { x: 0, y: 0, w: 3, h: 3 };
  const sensorPlacement: GridPlacement = { x: 3, y: 0, w: 3, h: 2 };
  const scenePlacement: GridPlacement = { x: 6, y: 0, w: 2, h: 2 };

  const light = createComponentFromCatalog(
    "light-card",
    "cmp-light-main",
    page.pageId,
    lightPlacement,
  );
  const sensor = createComponentFromCatalog(
    "sensor-card",
    "cmp-sensor-temp",
    page.pageId,
    sensorPlacement,
  );
  const scene = createComponentFromCatalog(
    "scene-button",
    "cmp-scene-evening",
    page.pageId,
    scenePlacement,
  );

  light.props = { ...light.props, title: "Living Light", subtitle: "alias.0.living.light" };
  sensor.props = { ...sensor.props, title: "Temperature", unit: "C", precision: 1 };
  scene.props = { ...scene.props, title: "Evening", value: true };

  const lightBinding: Binding = {
    bindingId: "bind-light-main",
    componentId: light.componentId,
    target: "value",
    kind: "state",
    mode: "readwrite",
    stateId: "alias.0.living.light",
    missing: true,
  };
  const sensorBinding: Binding = {
    bindingId: "bind-sensor-temp",
    componentId: sensor.componentId,
    target: "value",
    kind: "state",
    mode: "read",
    stateId: "alias.0.living.temperature",
    missing: true,
  };
  const bindings: Binding[] = [lightBinding, sensorBinding];

  light.bindingIds = [lightBinding.bindingId];
  sensor.bindingIds = [sensorBinding.bindingId];

  const actions: DashboardAction[] = [
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
    schemaVersion: CURRENT_SCHEMA_VERSION,
    projectId: options.projectId ?? "default",
    name: options.name ?? "My Home",
    pages: [page],
    layouts: {
      default: defaultLayout,
    },
    components: [light, sensor, scene],
    bindings,
    actions,
    themes: [modernDarkTheme, cleanLightTheme],
    assets: [],
    templates: createStarterTemplates(now),
    settings: {
      activeThemeId: modernDarkTheme.themeId,
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

function createStarterTemplates(now: string): Template[] {
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
