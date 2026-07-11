import { beforeEach, describe, expect, it } from "vitest";
import {
  createDefaultDashboard,
  validateDashboardProject,
  type Binding,
} from "@dashboard-ng/shared";
import { getBindingDisplayUnit, resolveTargetState } from "../packages/runtime/src/state";
import { getComponentBinding, useEditorStore } from "../packages/editor/src/store/editorStore";

describe("formula bindings", () => {
  beforeEach(() => {
    useEditorStore
      .getState()
      .setProject(createDefaultDashboard({ now: "2026-07-03T00:00:00.000Z" }), "Test");
  });

  it("stores formula bindings for component targets", () => {
    useEditorStore.getState().addComponent("sensor-card");
    const componentId = useEditorStore.getState().selectedIds[0]!;

    useEditorStore
      .getState()
      .setComponentFormulaBinding(componentId, "value", "alias.0.temperature", "value / 10");

    const project = useEditorStore.getState().project;
    const component = project.components.find((item) => item.componentId === componentId)!;
    const binding = getComponentBinding(project, component, "value");

    expect(binding).toEqual(
      expect.objectContaining({
        target: "value",
        kind: "formula",
        mode: "read",
        stateId: "alias.0.temperature",
        formula: "value / 10",
      }),
    );
    expect(component.bindingIds).toEqual([binding?.bindingId]);
    expect(validateDashboardProject(project).valid).toBe(true);
  });

  it("resolves formula bindings from runtime state values", () => {
    const binding: Binding = {
      bindingId: "bind-formula",
      componentId: "cmp-sensor",
      target: "value",
      kind: "formula",
      mode: "read",
      stateId: "alias.0.energy",
      formula: "round(value / 1000, 2)",
      missing: false,
    };

    const resolved = resolveTargetState([binding], { "alias.0.energy": 2150 });

    expect(resolved.value).toBe(2.15);
    expect(resolved.loading).toBe(false);
    expect(resolved.writable).toBe(false);
    expect(resolved.stateId).toBe("alias.0.energy");
  });

  it("calculates component values from multiple referenced states", () => {
    const binding: Binding = {
      bindingId: "bind-calculated",
      componentId: "cmp-energy",
      target: "value",
      kind: "formula",
      mode: "read",
      formula: '(state("solar.power") + state("grid.power")) / 1000',
      missing: false,
    };

    const resolved = resolveTargetState([binding], {
      "solar.power": 1400,
      "grid.power": 600,
    });

    expect(resolved.value).toBe(2);
    expect(resolved.loading).toBe(false);
    expect(resolved.error).toBeUndefined();
  });

  it("keeps invalid runtime formulas visible as target errors", () => {
    const binding: Binding = {
      bindingId: "bind-formula",
      componentId: "cmp-sensor",
      target: "value",
      kind: "formula",
      mode: "read",
      stateId: "alias.0.energy",
      formula: "value / 0",
      missing: false,
    };

    const resolved = resolveTargetState([binding], { "alias.0.energy": 2150 });

    expect(resolved.value).toBeUndefined();
    expect(resolved.error).toContain("Division by zero");
    expect(resolved.writable).toBe(false);
  });

  it("contains formula tokenization errors inside the target state", () => {
    const binding: Binding = {
      bindingId: "bind-invalid-token",
      componentId: "cmp-sensor",
      target: "value",
      kind: "formula",
      mode: "read",
      formula: "value ? 2",
      missing: false,
    };

    expect(() => resolveTargetState([binding], {})).not.toThrow();
    expect(resolveTargetState([binding], {}).error).toContain("Unsupported character");
  });

  it("applies value transforms and display formats", () => {
    const binding: Binding = {
      bindingId: "bind-transform",
      componentId: "cmp-energy",
      target: "value",
      kind: "state",
      mode: "read",
      stateId: "alias.0.energy",
      transform: { formula: "value / 1000", format: "energy", decimals: 2 },
      missing: false,
    };

    const resolved = resolveTargetState([binding], { "alias.0.energy": 2155 });

    expect(resolved.value).toBe(2.16);
    expect(getBindingDisplayUnit(resolved.binding)).toBe("kWh");
    expect(resolved.error).toBeUndefined();
  });

  it("reports invalid stored formulas with their schema path", () => {
    const project = createDefaultDashboard();
    project.bindings[0] = {
      ...project.bindings[0]!,
      kind: "formula",
      mode: "read",
      formula: "value / 0",
    };

    expect(validateDashboardProject(project)).toMatchObject({
      valid: false,
      issues: [
        expect.objectContaining({
          path: "$.bindings[0].formula",
          message: "Division by zero.",
          severity: "error",
        }),
      ],
    });
  });
});
