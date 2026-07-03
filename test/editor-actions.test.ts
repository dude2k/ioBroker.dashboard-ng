import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultDashboard, validateDashboardProject } from "@dashboard-ng/shared";
import { useEditorStore } from "../packages/editor/src/store/editorStore";

describe("editor action configuration", () => {
  beforeEach(() => {
    useEditorStore
      .getState()
      .setProject(createDefaultDashboard({ now: "2026-07-02T00:00:00.000Z" }), "Test");
  });

  it("adds, edits and removes ordered component action steps", () => {
    useEditorStore.getState().addComponent("scene-button");
    const componentId = useEditorStore.getState().selectedIds[0]!;

    useEditorStore.getState().addComponentAction(componentId, "longPress");
    let project = useEditorStore.getState().project;
    let action = project.actions.find((candidate) => candidate.componentId === componentId)!;

    expect(action.trigger).toBe("longPress");
    expect(action.steps).toHaveLength(1);

    useEditorStore.getState().updateComponentActionStep(action.actionId, 0, {
      kind: "setState",
      stateId: "alias.0.scene",
      value: true,
    });
    useEditorStore.getState().addComponentActionStep(action.actionId);

    project = useEditorStore.getState().project;
    action = project.actions.find((candidate) => candidate.componentId === componentId)!;
    expect(action.steps).toEqual([
      { kind: "setState", stateId: "alias.0.scene", value: true },
      { kind: "navigate", pageId: project.pages[0]?.pageId },
    ]);
    expect(validateDashboardProject(project).valid).toBe(true);

    useEditorStore.getState().removeComponentActionStep(action.actionId, 1);
    useEditorStore.getState().updateComponentActionTrigger(action.actionId, "tap");

    project = useEditorStore.getState().project;
    action = project.actions.find((candidate) => candidate.componentId === componentId)!;
    expect(action.trigger).toBe("tap");
    expect(action.steps).toHaveLength(1);

    useEditorStore.getState().removeComponentAction(action.actionId);
    project = useEditorStore.getState().project;
    const component = project.components.find(
      (candidate) => candidate.componentId === componentId,
    )!;

    expect(project.actions.filter((candidate) => candidate.componentId === componentId)).toEqual(
      [],
    );
    expect(component.actionIds).toEqual([]);
  });
});
