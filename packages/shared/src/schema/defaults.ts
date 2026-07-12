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
      reconnectIntervalMs: 2500,
    },
    createdAt: now,
    updatedAt: now,
    migrationHistory: [],
  };
}

export function createStarterTemplates(now = new Date().toISOString()): Template[] {
  return [
    createStarterTemplate(
      "tpl-wall-overview",
      "Wall Overview",
      "Starter wall-panel overview with room, climate, light and energy controls.",
      [
        ["room-card", "Living room", { x: 0, y: 0, w: 4, h: 3 }],
        ["thermostat-card", "Climate", { x: 4, y: 0, w: 3, h: 4 }],
        ["light-card", "Main light", { x: 7, y: 0, w: 3, h: 3 }],
        ["energy-card", "Power", { x: 0, y: 3, w: 4, h: 3 }],
        ["scene-button", "Evening", { x: 7, y: 3, w: 3, h: 2 }],
      ],
      now,
    ),
    createStarterTemplate(
      "tpl-mobile-status",
      "Mobile Status",
      "Compact mobile status page for climate, energy and a favorite scene.",
      [
        ["sensor-card", "Temperature", { x: 0, y: 0, w: 2, h: 2 }],
        ["sensor-card", "Humidity", { x: 2, y: 0, w: 2, h: 2 }],
        ["energy-card", "Power", { x: 0, y: 2, w: 4, h: 3 }],
        ["scene-button", "Good night", { x: 0, y: 5, w: 4, h: 2 }],
      ],
      now,
    ),
  ];
}

export function upgradeStarterTemplates(project: DashboardProject): DashboardProject {
  const starters = new Map(
    createStarterTemplates(project.createdAt).map((template) => [template.templateId, template]),
  );
  let changed = false;
  const templates = project.templates.map((template) => {
    const replacement = starters.get(template.templateId);
    if (replacement && !template.components?.length) {
      changed = true;
      return replacement;
    }
    return template;
  });
  return changed ? { ...project, templates } : project;
}

type StarterComponent = [Parameters<typeof createComponentFromCatalog>[0], string, GridPlacement];

function createStarterTemplate(
  templateId: string,
  name: string,
  description: string,
  entries: StarterComponent[],
  now: string,
): Template {
  const pageId = `${templateId}-page`;
  const components = entries.map(([type, title, placement], index) => {
    const component = createComponentFromCatalog(
      type,
      `${templateId}-cmp-${index + 1}`,
      pageId,
      placement,
    );
    component.name = title;
    component.props = { ...component.props, title };
    return component;
  });
  return {
    templateId,
    name,
    kind: "page",
    componentIds: components.map((component) => component.componentId),
    page: {
      pageId,
      name,
      order: 0,
      componentIds: components.map((component) => component.componentId),
      settings: {},
    },
    components,
    bindings: [],
    actions: [],
    metadata: { description, createdAt: now, starter: "true" },
  };
}
