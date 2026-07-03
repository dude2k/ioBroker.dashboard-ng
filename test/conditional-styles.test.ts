import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultDashboard, validateDashboardProject } from "@dashboard-ng/shared";
import {
  getConditionalStyleRule,
  resolveConditionalStyleClass,
} from "../packages/runtime/src/conditionalStyles";
import { getComponentBinding, useEditorStore } from "../packages/editor/src/store/editorStore";

describe("conditional styles", () => {
  beforeEach(() => {
    useEditorStore
      .getState()
      .setProject(createDefaultDashboard({ now: "2026-07-02T00:00:00.000Z" }), "Test");
  });

  it("stores state based conditional styles with an internal style binding", () => {
    useEditorStore.getState().addComponent("sensor-card");
    const componentId = useEditorStore.getState().selectedIds[0]!;

    useEditorStore.getState().setComponentConditionalStyle(componentId, {
      enabled: true,
      tone: "warning",
      operator: "greaterThan",
      stateId: "alias.0.temperature",
      expected: 25,
    });

    const project = useEditorStore.getState().project;
    const component = project.components.find(
      (candidate) => candidate.componentId === componentId,
    )!;
    const binding = getComponentBinding(project, component, "style");

    expect(binding?.stateId).toBe("alias.0.temperature");
    expect(getConditionalStyleRule(component)).toEqual({
      enabled: true,
      tone: "warning",
      operator: "greaterThan",
      stateId: "alias.0.temperature",
      expected: 25,
    });
    expect(validateDashboardProject(project).valid).toBe(true);
  });

  it("resolves runtime conditional style classes", () => {
    const project = createDefaultDashboard();
    const component = {
      ...project.components[0]!,
      style: {
        conditional: {
          enabled: true,
          tone: "danger",
          operator: "greaterThan",
          stateId: "alias.0.temperature",
          expected: 25,
        },
      },
    };
    const binding = {
      bindingId: "bind-style",
      componentId: component.componentId,
      target: "style",
      kind: "state" as const,
      mode: "read" as const,
      stateId: "alias.0.temperature",
      missing: false,
    };

    expect(resolveConditionalStyleClass(component, [binding], { "alias.0.temperature": 26 })).toBe(
      "has-conditional-danger",
    );
    expect(resolveConditionalStyleClass(component, [binding], { "alias.0.temperature": 24 })).toBe(
      "",
    );
  });
});
