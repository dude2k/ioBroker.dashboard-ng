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
    description: "Prepared room overview card.",
    icon: "House",
    defaultSize: { w: 4, h: 3 },
    defaultProps: { title: "Room" },
    implemented: false,
  },
  {
    type: "thermostat-card",
    label: "Thermostat",
    description: "Prepared thermostat card.",
    icon: "Gauge",
    defaultSize: { w: 3, h: 4 },
    defaultProps: { title: "Thermostat" },
    implemented: false,
  },
  {
    type: "blind-card",
    label: "Blind",
    description: "Prepared blind/shutter control.",
    icon: "PanelTop",
    defaultSize: { w: 3, h: 3 },
    defaultProps: { title: "Blind" },
    implemented: false,
  },
  {
    type: "energy-card",
    label: "Energy",
    description: "Prepared energy overview.",
    icon: "Zap",
    defaultSize: { w: 4, h: 3 },
    defaultProps: { title: "Energy" },
    implemented: false,
  },
  {
    type: "mini-chart-card",
    label: "Chart",
    description: "Prepared compact chart card.",
    icon: "ChartLine",
    defaultSize: { w: 4, h: 3 },
    defaultProps: { title: "Trend" },
    implemented: false,
  },
  {
    type: "camera-card",
    label: "Camera",
    description: "Prepared camera card.",
    icon: "Camera",
    defaultSize: { w: 4, h: 3 },
    defaultProps: { title: "Camera" },
    implemented: false,
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
