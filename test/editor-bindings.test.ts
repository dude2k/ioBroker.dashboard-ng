import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultDashboard, validateDashboardProject } from "@dashboard-ng/shared";
import { getComponentBinding, useEditorStore } from "../packages/editor/src/store/editorStore";

describe("editor component bindings", () => {
  beforeEach(() => {
    useEditorStore
      .getState()
      .setProject(createDefaultDashboard({ now: "2026-07-02T00:00:00.000Z" }), "Test");
  });

  it("sets and updates bindings for explicit component targets", () => {
    useEditorStore.getState().addComponent("camera-card");
    const componentId = useEditorStore.getState().selectedIds[0]!;

    useEditorStore
      .getState()
      .setComponentBinding(componentId, "imageUrl", "alias.0.camera.snapshot", "read");

    const project = useEditorStore.getState().project;
    const component = project.components.find((item) => item.componentId === componentId)!;
    const binding = getComponentBinding(project, component, "imageUrl");

    expect(binding?.target).toBe("imageUrl");
    expect(binding?.stateId).toBe("alias.0.camera.snapshot");
    expect(component.bindingIds).toEqual([binding?.bindingId]);
    expect(validateDashboardProject(project).valid).toBe(true);
  });

  it("keeps generated light actions aligned with value bindings", () => {
    useEditorStore.getState().addComponent("light-card");
    const componentId = useEditorStore.getState().selectedIds[0]!;

    useEditorStore.getState().setComponentBinding(componentId, "value", "alias.0.light", "read");
    useEditorStore
      .getState()
      .setComponentBinding(componentId, "value", "alias.0.light", "readwrite");

    let project = useEditorStore.getState().project;
    let component = project.components.find((item) => item.componentId === componentId)!;
    let binding = getComponentBinding(project, component, "value");

    expect(binding?.mode).toBe("readwrite");
    expect(project.actions.filter((action) => action.componentId === componentId)).toEqual([
      expect.objectContaining({ steps: [{ kind: "toggleState", stateId: "alias.0.light" }] }),
    ]);

    useEditorStore.getState().removeComponentBinding(componentId, "value");

    project = useEditorStore.getState().project;
    component = project.components.find((item) => item.componentId === componentId)!;
    binding = getComponentBinding(project, component, "value");

    expect(binding).toBeUndefined();
    expect(component.bindingIds).toEqual([]);
    expect(component.actionIds).toEqual([]);
    expect(project.actions.filter((action) => action.componentId === componentId)).toEqual([]);
  });
});
