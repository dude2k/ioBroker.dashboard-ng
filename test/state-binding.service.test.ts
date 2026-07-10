import { describe, expect, it, vi } from "vitest";
import { StateBindingService, type AdapterStateApi } from "../src/services/state-binding.service";

describe("state binding service metadata", () => {
  it("exposes localized names, enums, aliases and quality metadata", async () => {
    const adapter: AdapterStateApi = {
      log: { warn: vi.fn() },
      getForeignObjectsAsync: vi.fn(async (pattern, type) => {
        if (type === "state") {
          return {
            "alias.0.living.temperature": {
              common: {
                name: { en: "Temperature", de: "Temperatur" },
                role: "value.temperature",
                type: "number",
                unit: "C",
                min: -20,
                max: 60,
                read: true,
                write: false,
                alias: { id: "zigbee.0.sensor.temperature" },
              },
            },
          };
        }
        if (pattern === "enum.rooms.*") {
          return {
            "enum.rooms.living": {
              common: {
                name: { en: "Living room", de: "Wohnzimmer" },
                members: ["alias.0.living"],
              },
            },
          };
        }
        return {
          "enum.functions.climate": {
            common: { name: "Climate", members: ["alias.0.living.temperature"] },
          },
        };
      }),
      getForeignStatesAsync: vi.fn(async () => ({
        "alias.0.living.temperature": {
          val: 21.5,
          ack: false,
          q: 16,
          ts: 1000,
          lc: 900,
        },
      })),
      getForeignObjectAsync: vi.fn(),
      getForeignStateAsync: vi.fn(),
      setForeignStateAsync: vi.fn(),
    };

    const states = await new StateBindingService(adapter).searchObjects("Temperatur", 20);

    expect(states).toEqual([
      expect.objectContaining({
        id: "alias.0.living.temperature",
        names: ["Temperature", "Temperatur"],
        parentId: "alias.0.living",
        room: "Living room",
        rooms: ["Living room", "Wohnzimmer"],
        function: "Climate",
        functions: ["Climate"],
        alias: true,
        aliasTarget: "zigbee.0.sensor.temperature",
        value: 21.5,
        ack: false,
        q: 16,
        ts: 1000,
        lc: 900,
        missing: false,
      }),
    ]);

    await expect(
      new StateBindingService(adapter).searchObjects("Wohnzimmer", 20),
    ).resolves.toHaveLength(1);
  });
});
