import type { ComponentType, DashboardComponent, GridPlacement } from "../schema/types";

export interface ComponentCatalogEntry {
  type: ComponentType;
  label: string;
  description: string;
  icon: string;
  defaultSize: Pick<GridPlacement, "w" | "h">;
  defaultProps: Record<string, unknown>;
  implemented: boolean;
}

export const componentCatalog: ComponentCatalogEntry[] = [
  {
    type: "light-card",
    label: "Light",
    description: "Read and toggle a light state.",
    icon: "Lightbulb",
    defaultSize: { w: 3, h: 3 },
    defaultProps: { title: "Light", subtitle: "Tap to toggle" },
    implemented: true,
  },
  {
    type: "sensor-card",
    label: "Sensor",
    description: "Display a sensor value with unit.",
    icon: "Thermometer",
    defaultSize: { w: 3, h: 2 },
    defaultProps: { title: "Sensor", unit: "", precision: 1 },
    implemented: true,
  },
  {
    type: "scene-button",
    label: "Scene",
    description: "Trigger a state or scene.",
    icon: "Sparkles",
    defaultSize: { w: 2, h: 2 },
    defaultProps: { title: "Scene", value: true },
    implemented: true,
  },
  {
    type: "room-card",
    label: "Room",
    description: "Show a compact room overview.",
    icon: "House",
    defaultSize: { w: 4, h: 3 },
    defaultProps: { title: "Room", subtitle: "Overview", zone: "Room" },
    implemented: true,
  },
  {
    type: "thermostat-card",
    label: "Thermostat",
    description: "Display current and target temperature.",
    icon: "Gauge",
    defaultSize: { w: 3, h: 4 },
    defaultProps: { title: "Thermostat", unit: "C", target: "21 C" },
    implemented: true,
  },
  {
    type: "blind-card",
    label: "Blind",
    description: "Display blind or shutter position.",
    icon: "PanelTop",
    defaultSize: { w: 3, h: 3 },
    defaultProps: { title: "Blind", subtitle: "Position" },
    implemented: true,
  },
  {
    type: "energy-card",
    label: "Energy",
    description: "Display current energy or power values.",
    icon: "Zap",
    defaultSize: { w: 4, h: 3 },
    defaultProps: { title: "Energy", unit: "W", period: "Current" },
    implemented: true,
  },
  {
    type: "mini-chart-card",
    label: "Chart",
    description: "Render a compact trend chart.",
    icon: "ChartLine",
    defaultSize: { w: 4, h: 3 },
    defaultProps: { title: "Trend", samples: [28, 42, 36, 64, 58, 82, 70] },
    implemented: true,
  },
  {
    type: "camera-card",
    label: "Camera",
    description: "Display a camera image or snapshot URL.",
    icon: "Camera",
    defaultSize: { w: 4, h: 3 },
    defaultProps: { title: "Camera", imageUrl: "" },
    implemented: true,
  },
];

export function createComponentFromCatalog(
  type: ComponentType,
  componentId: string,
  pageId: string,
  placement: GridPlacement,
): DashboardComponent {
  const entry = getCatalogEntry(type);
  return {
    componentId,
    type: entry.type,
    pageId,
    name: String(entry.defaultProps.title ?? entry.label),
    props: { ...entry.defaultProps },
    style: {},
    layout: {
      desktop: placement,
      tablet: { ...placement, w: Math.min(placement.w, 4) },
      phone: { x: 0, y: placement.y, w: 4, h: placement.h },
      wall: placement,
    },
    bindingIds: [],
    actionIds: [],
    visibility: { kind: "always" },
  };
}

export function getCatalogEntry(type: ComponentType): ComponentCatalogEntry {
  const entry = componentCatalog.find((item) => item.type === type);
  if (entry) {
    return entry;
  }

  const fallback = componentCatalog.find((item) => item.type === "light-card");
  if (!fallback) {
    throw new Error("Component catalog is missing its light-card fallback.");
  }
  return fallback;
}
