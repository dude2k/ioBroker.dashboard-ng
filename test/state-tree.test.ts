import { describe, expect, it } from "vitest";
import type { StateOption } from "@dashboard-ng/shared";
import { buildStateTree, filterStateOptions } from "../packages/editor/src/lib/stateTree";

const states: StateOption[] = [
  {
    id: "alias.0.living.temperature",
    name: "Temperature",
    names: ["Temperature", "Temperatur"],
    type: "number",
    role: "value.temperature",
    unit: "C",
    room: "Living room",
    function: "Climate",
    read: true,
    write: false,
  },
  {
    id: "zigbee.0.lamp.state",
    name: "Lamp",
    type: "boolean",
    role: "switch.light",
    read: true,
    write: true,
  },
];

describe("state picker tree", () => {
  it("builds a browsable hierarchy from object IDs", () => {
    const tree = buildStateTree(states);
    expect(tree.map((node) => node.label)).toEqual(["alias", "zigbee"]);
    expect(tree[0]?.count).toBe(1);
    expect(tree[0]?.children[0]?.children[0]?.states[0]?.id).toBe("alias.0.living.temperature");
  });

  it.each(["Temperatur", "value.temperature", "Living room", "Climate", "C"])(
    "searches localized and metadata field %s",
    (query) => {
      expect(filterStateOptions(states, query).map((state) => state.id)).toContain(
        "alias.0.living.temperature",
      );
    },
  );
});
