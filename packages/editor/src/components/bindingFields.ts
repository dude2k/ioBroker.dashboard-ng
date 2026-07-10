import type { BindingMode, ComponentType } from "@dashboard-ng/shared";

export interface InspectorBindingTarget {
  target: string;
  label: string;
  description: string;
  defaultMode: BindingMode;
  modes: BindingMode[];
}

const readModes: BindingMode[] = ["read"];
const writeModes: BindingMode[] = ["write", "readwrite"];
const readWriteModes: BindingMode[] = ["read", "write", "readwrite"];

export const bindingTargetsByType: Record<ComponentType, InspectorBindingTarget[]> = {
  "light-card": [
    {
      target: "value",
      label: "Power state",
      description: "Reads and toggles the light state.",
      defaultMode: "readwrite",
      modes: readWriteModes,
    },
    {
      target: "brightness",
      label: "Brightness",
      description: "Optional dimmer level for detected lights.",
      defaultMode: "readwrite",
      modes: readWriteModes,
    },
  ],
  "sensor-card": [
    {
      target: "value",
      label: "Sensor value",
      description: "Reads the displayed sensor value.",
      defaultMode: "read",
      modes: readModes,
    },
  ],
  "scene-button": [
    {
      target: "value",
      label: "Scene state",
      description: "Writes the configured scene value.",
      defaultMode: "write",
      modes: writeModes,
    },
  ],
  "room-card": [
    {
      target: "value",
      label: "Room status",
      description: "Reads the compact room status.",
      defaultMode: "read",
      modes: readModes,
    },
  ],
  "thermostat-card": [
    {
      target: "value",
      label: "Current temperature",
      description: "Reads the current temperature.",
      defaultMode: "read",
      modes: readModes,
    },
    {
      target: "target",
      label: "Target temperature",
      description: "Reads or writes the thermostat setpoint.",
      defaultMode: "readwrite",
      modes: readWriteModes,
    },
  ],
  "blind-card": [
    {
      target: "value",
      label: "Position state",
      description: "Reads or writes the blind position.",
      defaultMode: "readwrite",
      modes: readWriteModes,
    },
    {
      target: "open",
      label: "Open command",
      description: "Optional writable state for opening the blind.",
      defaultMode: "write",
      modes: writeModes,
    },
    {
      target: "close",
      label: "Close command",
      description: "Optional writable state for closing the blind.",
      defaultMode: "write",
      modes: writeModes,
    },
    {
      target: "stop",
      label: "Stop command",
      description: "Optional writable state for stopping the blind.",
      defaultMode: "write",
      modes: writeModes,
    },
  ],
  "energy-card": [
    {
      target: "value",
      label: "Energy value",
      description: "Reads the displayed power or energy value.",
      defaultMode: "read",
      modes: readModes,
    },
  ],
  "mini-chart-card": [
    {
      target: "samples",
      label: "Trend samples",
      description: "Reads numeric samples for the compact trend chart.",
      defaultMode: "read",
      modes: readModes,
    },
  ],
  "camera-card": [
    {
      target: "imageUrl",
      label: "Image URL state",
      description: "Reads a camera snapshot URL.",
      defaultMode: "read",
      modes: readModes,
    },
  ],
  text: [
    {
      target: "value",
      label: "Text value",
      description: "Reads text from a state.",
      defaultMode: "read",
      modes: readModes,
    },
  ],
  container: [],
  button: [
    {
      target: "value",
      label: "Button state",
      description: "Reads or writes a button state.",
      defaultMode: "write",
      modes: writeModes,
    },
  ],
  "value-display": [
    {
      target: "value",
      label: "Display value",
      description: "Reads the displayed value.",
      defaultMode: "read",
      modes: readModes,
    },
  ],
};

export function getBindingTargets(type: ComponentType): InspectorBindingTarget[] {
  return bindingTargetsByType[type] ?? [];
}
