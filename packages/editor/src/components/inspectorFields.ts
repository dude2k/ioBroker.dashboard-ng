import type { ComponentType } from "@dashboard-ng/shared";

export type InspectorFieldKind = "text" | "number" | "boolean" | "samples" | "url";

export interface InspectorField {
  prop: string;
  label: string;
  kind: InspectorFieldKind;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

const titleField: InspectorField = {
  prop: "title",
  label: "Title",
  kind: "text",
};

const subtitleField: InspectorField = {
  prop: "subtitle",
  label: "Subtitle",
  kind: "text",
};

export const inspectorFieldsByType: Record<ComponentType, InspectorField[]> = {
  "light-card": [titleField, subtitleField],
  "sensor-card": [
    titleField,
    subtitleField,
    { prop: "unit", label: "Unit", kind: "text", placeholder: "C" },
    { prop: "precision", label: "Decimals", kind: "number", min: 0, max: 6, step: 1 },
  ],
  "scene-button": [
    titleField,
    subtitleField,
    { prop: "value", label: "Write value", kind: "boolean" },
  ],
  "room-card": [
    titleField,
    subtitleField,
    { prop: "zone", label: "Zone", kind: "text", placeholder: "Living room" },
  ],
  "thermostat-card": [
    titleField,
    subtitleField,
    { prop: "unit", label: "Unit", kind: "text", placeholder: "C" },
    { prop: "target", label: "Target", kind: "text", placeholder: "21 C" },
  ],
  "blind-card": [titleField, subtitleField],
  "energy-card": [
    titleField,
    subtitleField,
    { prop: "unit", label: "Unit", kind: "text", placeholder: "W" },
    { prop: "period", label: "Period", kind: "text", placeholder: "Current" },
  ],
  "mini-chart-card": [
    titleField,
    subtitleField,
    { prop: "samples", label: "Samples", kind: "samples", placeholder: "28, 42, 36" },
  ],
  "camera-card": [
    titleField,
    subtitleField,
    { prop: "imageUrl", label: "Image URL", kind: "url", placeholder: "https://..." },
  ],
  text: [titleField, { prop: "text", label: "Text", kind: "text" }],
  container: [titleField, subtitleField],
  button: [titleField, subtitleField],
  "value-display": [
    titleField,
    subtitleField,
    { prop: "unit", label: "Unit", kind: "text" },
    { prop: "precision", label: "Decimals", kind: "number", min: 0, max: 6, step: 1 },
  ],
};

export function getInspectorFields(type: ComponentType): InspectorField[] {
  return inspectorFieldsByType[type] ?? [titleField];
}

export function formatInspectorValue(value: unknown, field: InspectorField): string {
  if (field.kind === "samples") {
    return Array.isArray(value) ? value.join(", ") : "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "";
}

export function parseInspectorValue(value: string, field: InspectorField): unknown {
  if (field.kind === "number") {
    if (!value.trim()) {
      return undefined;
    }
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    const min = field.min ?? Number.NEGATIVE_INFINITY;
    const max = field.max ?? Number.POSITIVE_INFINITY;
    return Math.max(min, Math.min(max, parsed));
  }

  if (field.kind === "samples") {
    return value
      .split(",")
      .map((item) => Number.parseFloat(item.trim()))
      .filter((item) => Number.isFinite(item));
  }

  return value;
}
