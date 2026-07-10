import { describe, expect, it } from "vitest";
import {
  detectDeviceMapping,
  type ComponentType,
  type DeviceKind,
  type StateOption,
} from "@dashboard-ng/shared";

function option(
  id: string,
  role: string,
  write = false,
  type: StateOption["type"] = "number",
): StateOption {
  return {
    id,
    name: id.slice(id.lastIndexOf(".") + 1),
    parentId: id.slice(0, id.lastIndexOf(".")),
    type,
    role,
    read: true,
    write,
  };
}

describe("device mapping", () => {
  it.each<[DeviceKind, StateOption]>([
    ["light", option("dev.light.state", "switch.light", true, "boolean")],
    ["thermostat", option("dev.thermostat.actual", "value.temperature")],
    ["blind", option("dev.blind.position", "level.blind", true)],
    ["sensor", option("dev.sensor.humidity", "value.humidity")],
    ["scene", option("dev.scene.run", "button", true, "boolean")],
    ["energy", option("dev.meter.power", "value.power")],
    ["camera", option("dev.camera.snapshot", "url", false, "string")],
  ])("detects %s devices from ioBroker roles", (kind, selected) => {
    expect(detectDeviceMapping(selected, [selected]).kind).toBe(kind);
  });

  it("maps related light and thermostat states by their metadata", () => {
    const light = option("zigbee.0.lamp.state", "switch.light", true, "boolean");
    const dimmer = option("zigbee.0.lamp.brightness", "level.dimmer", true);
    const lightMapping = detectDeviceMapping(light, [light, dimmer], "light-card");
    expect(lightMapping.bindings).toEqual([
      { target: "value", stateId: light.id, mode: "readwrite" },
      { target: "brightness", stateId: dimmer.id, mode: "readwrite" },
    ]);

    const actual = option("hm.0.thermostat.actual", "value.temperature");
    const target = option("hm.0.thermostat.setpoint", "level.temperature", true);
    const thermostatMapping = detectDeviceMapping(actual, [actual, target], "thermostat-card");
    expect(thermostatMapping.bindings).toEqual([
      { target: "value", stateId: actual.id, mode: "read" },
      { target: "target", stateId: target.id, mode: "readwrite" },
    ]);
  });

  it("adapts a sensor mapping to chart targets", () => {
    const sensor = option("alias.0.room.temperature", "value.temperature");
    const mapping = detectDeviceMapping(sensor, [sensor], "mini-chart-card" as ComponentType);
    expect(mapping.bindings[0]).toEqual({
      target: "samples",
      stateId: sensor.id,
      mode: "read",
    });
  });

  it("maps writable blind commands", () => {
    const states = [
      option("shelly.0.blind.position", "level.blind", true),
      option("shelly.0.blind.open", "button.open", true, "boolean"),
      option("shelly.0.blind.close", "button.close", true, "boolean"),
      option("shelly.0.blind.stop", "button.stop", true, "boolean"),
    ];

    const mapping = detectDeviceMapping(states[0]!, states, "blind-card");

    expect(mapping.bindings.map((binding) => [binding.target, binding.mode])).toEqual([
      ["value", "readwrite"],
      ["open", "readwrite"],
      ["close", "readwrite"],
      ["stop", "readwrite"],
    ]);
  });
});
