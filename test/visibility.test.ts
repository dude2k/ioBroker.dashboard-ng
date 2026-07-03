import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultDashboard, validateDashboardProject } from "@dashboard-ng/shared";
import { isComponentVisible } from "../packages/runtime/src/visibility";
import { getComponentBinding, useEditorStore } from "../packages/editor/src/store/editorStore";

describe("conditional visibility", () => {
  beforeEach(() => {
    useEditorStore
      .getState()
      .setProject(createDefaultDashboard({ now: "2026-07-02T00:00:00.000Z" }), "Test");
  });

  it("stores state based visibility with an internal visibility binding", () => {
    useEditorStore.getState().addComponent("sensor-card");
    const componentId = useEditorStore.getState().selectedIds[0]!;

    useEditorStore
      .getState()
      .setComponentVisibilityCondition(componentId, "alias.0.presence", "equals", true);

    const project = useEditorStore.getState().project;
    const component = project.components.find(
      (candidate) => candidate.componentId === componentId,
    )!;
    const binding = getComponentBinding(project, component, "visibility");

    expect(component.visibility).toEqual({
      kind: "binding",
      bindingId: binding?.bindingId,
      expected: true,
    });
    expect(binding?.stateId).toBe("alias.0.presence");
    expect(validateDashboardProject(project).valid).toBe(true);
  });

  it("evaluates binding and formula visibility rules safely", () => {
    const project = createDefaultDashboard();
    const component = project.components[0]!;
    const binding = {
      bindingId: "bind-visibility",
      componentId: component.componentId,
      target: "visibility",
      kind: "state" as const,
      mode: "read" as const,
      stateId: "alias.0.temperature",
      missing: false,
    };

    expect(
      isComponentVisible(
        {
          ...component,
          visibility: { kind: "binding", bindingId: binding.bindingId, expected: 21 },
        },
        [binding],
        { "alias.0.temperature": 21 },
      ),
    ).toBe(true);
    expect(
      isComponentVisible(
        {
          ...component,
          visibility: {
            kind: "formula",
            bindingId: binding.bindingId,
            formula: "value > expected",
            expected: 20,
          },
        },
        [binding],
        { "alias.0.temperature": 21 },
      ),
    ).toBe(true);
    expect(
      isComponentVisible(
        {
          ...component,
          visibility: {
            kind: "formula",
            bindingId: binding.bindingId,
            formula: "value < expected",
            expected: 20,
          },
        },
        [binding],
        { "alias.0.temperature": 21 },
      ),
    ).toBe(false);
  });
});
