import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultDashboard, validateDashboardProject } from "@dashboard-ng/shared";
import { isEditorHidden, isEditorLocked } from "../packages/editor/src/lib/componentEditorState";
import { getPlacement, useEditorStore } from "../packages/editor/src/store/editorStore";

describe("editor selection actions", () => {
  beforeEach(() => {
    useEditorStore
      .getState()
      .setProject(createDefaultDashboard({ now: "2026-07-02T00:00:00.000Z" }), "Test");
  });

  it("supports additive multi-selection toggles", () => {
    useEditorStore.getState().addComponent("sensor-card");
    const firstId = useEditorStore.getState().selectedIds[0]!;
    useEditorStore.getState().addComponent("scene-button");
    const secondId = useEditorStore.getState().selectedIds[0]!;

    useEditorStore.getState().selectComponent(firstId, true);
    expect(useEditorStore.getState().selectedIds.sort()).toEqual([firstId, secondId].sort());

    useEditorStore.getState().selectComponent(firstId, true);
    expect(useEditorStore.getState().selectedIds).toEqual([secondId]);
  });

  it("duplicates selected components with bindings and actions but resets editor flags", () => {
    useEditorStore.getState().addComponent("light-card");
    const sourceId = useEditorStore.getState().selectedIds[0]!;
    useEditorStore.getState().setPrimaryBinding(sourceId, "alias.0.Light", "readwrite");
    useEditorStore.getState().toggleSelectedLock();
    useEditorStore.getState().toggleSelectedHidden();

    useEditorStore.getState().duplicateSelected();

    const project = useEditorStore.getState().project;
    const copyId = useEditorStore.getState().selectedIds[0]!;
    const copy = project.components.find((component) => component.componentId === copyId);

    expect(copy).toBeDefined();
    expect(copyId).not.toBe(sourceId);
    expect(copy?.bindingIds).toHaveLength(1);
    expect(copy?.actionIds).toHaveLength(1);
    expect(copy && isEditorLocked(copy)).toBe(false);
    expect(copy && isEditorHidden(copy)).toBe(false);
    expect(validateDashboardProject(project).valid).toBe(true);
  });

  it("keeps locked components from being deleted or nudged", () => {
    useEditorStore.getState().addComponent("sensor-card");
    const componentId = useEditorStore.getState().selectedIds[0]!;
    const beforeLock = useEditorStore
      .getState()
      .project.components.find((component) => component.componentId === componentId)!;

    useEditorStore.getState().nudgeSelected({ x: 1, y: 1 }, "desktop", 12);
    const moved = useEditorStore
      .getState()
      .project.components.find((component) => component.componentId === componentId)!;
    expect(getPlacement(moved, "desktop").x).toBe(getPlacement(beforeLock, "desktop").x + 1);

    useEditorStore.getState().toggleSelectedLock();
    useEditorStore.getState().nudgeSelected({ x: 1, y: 1 }, "desktop", 12);
    useEditorStore.getState().deleteSelected();

    const stillThere = useEditorStore
      .getState()
      .project.components.find((component) => component.componentId === componentId);
    expect(stillThere).toBeDefined();
    expect(stillThere && isEditorLocked(stillThere)).toBe(true);
    expect(useEditorStore.getState().status).toBe("Selection locked");
  });

  it("toggles hidden metadata without removing the selected component", () => {
    useEditorStore.getState().addComponent("sensor-card");
    const componentId = useEditorStore.getState().selectedIds[0]!;

    useEditorStore.getState().toggleSelectedHidden();
    let component = useEditorStore
      .getState()
      .project.components.find((candidate) => candidate.componentId === componentId)!;
    expect(isEditorHidden(component)).toBe(true);

    useEditorStore.getState().toggleSelectedHidden();
    component = useEditorStore
      .getState()
      .project.components.find((candidate) => candidate.componentId === componentId)!;
    expect(isEditorHidden(component)).toBe(false);
    expect(useEditorStore.getState().selectedIds).toEqual([componentId]);
  });

  it("ignores keyboard nudging when nothing is selected", () => {
    useEditorStore.getState().clearSelection();
    const before = useEditorStore.getState().project;

    useEditorStore.getState().nudgeSelected({ x: 1, y: 0 }, "desktop", 12);

    expect(useEditorStore.getState().project).toBe(before);
    expect(useEditorStore.getState().status).toBe("Test");
  });
});
