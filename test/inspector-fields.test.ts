import { describe, expect, it } from "vitest";
import { componentCatalog } from "@dashboard-ng/shared";
import {
  formatInspectorValue,
  getInspectorFields,
  parseInspectorValue,
} from "../packages/editor/src/components/inspectorFields";
import { getBindingTargets } from "../packages/editor/src/components/bindingFields";

describe("inspector field definitions", () => {
  it("exposes editable title fields for every catalog component", () => {
    for (const entry of componentCatalog) {
      expect(getInspectorFields(entry.type).map((field) => field.prop)).toContain("title");
    }
  });

  it("covers runtime-relevant MVP card properties", () => {
    expect(getInspectorFields("sensor-card").map((field) => field.prop)).toEqual([
      "title",
      "subtitle",
      "unit",
      "precision",
    ]);
    expect(getInspectorFields("mini-chart-card").map((field) => field.prop)).toContain("samples");
    expect(getInspectorFields("camera-card").map((field) => field.prop)).toContain("imageUrl");
    expect(getInspectorFields("scene-button").map((field) => field.prop)).toContain("value");
  });

  it("parses numeric and sample values without arbitrary code execution", () => {
    expect(parseInspectorValue("3", { prop: "precision", label: "Decimals", kind: "number" })).toBe(
      3,
    );
    expect(
      parseInspectorValue("1, 2, ignored, 4", {
        prop: "samples",
        label: "Samples",
        kind: "samples",
      }),
    ).toEqual([1, 2, 4]);
    expect(
      formatInspectorValue([1, 2, 4], { prop: "samples", label: "Samples", kind: "samples" }),
    ).toBe("1, 2, 4");
  });

  it("defines binding targets for MVP runtime properties", () => {
    expect(getBindingTargets("light-card").map((target) => target.target)).toEqual([
      "value",
      "brightness",
    ]);
    expect(getBindingTargets("thermostat-card").map((target) => target.target)).toEqual([
      "value",
      "target",
    ]);
    expect(getBindingTargets("blind-card").map((target) => target.target)).toEqual([
      "value",
      "open",
      "close",
      "stop",
    ]);
    expect(getBindingTargets("mini-chart-card")).toEqual([
      expect.objectContaining({ target: "samples", defaultMode: "read" }),
    ]);
    expect(getBindingTargets("camera-card")).toEqual([
      expect.objectContaining({ target: "imageUrl", defaultMode: "read" }),
    ]);
  });
});
