import { beforeEach, describe, expect, it } from "vitest";
import {
  canSetComponentParent,
  createDefaultDashboard,
  getDescendantIds,
  validateDashboardProject,
} from "../packages/shared/src";
import { useEditorStore } from "../packages/editor/src/store/editorStore";

describe("nested component hierarchy", () => {
  beforeEach(() => {
    useEditorStore.getState().setProject(createDefaultDashboard(), "Reset");
  });

  it("validates container parents and rejects hierarchy cycles", () => {
    const project = createDefaultDashboard();
    useEditorStore.getState().setProject(project, "Reset");
    useEditorStore.getState().addComponent("section", { x: 0, y: 5, w: 8, h: 7 });
    const section = useEditorStore.getState().project.components.at(-1)!;
    const light = useEditorStore.getState().project.components[0]!;
    useEditorStore.getState().setComponentParent(light.componentId, section.componentId);

    const nested = useEditorStore.getState().project;
    expect(nested.components.find((item) => item.componentId === light.componentId)?.parentId).toBe(
      section.componentId,
    );
    expect(validateDashboardProject(nested).valid).toBe(true);
    expect(canSetComponentParent(nested.components, section.componentId, light.componentId)).toBe(
      false,
    );

    const cyclic = structuredClone(nested);
    cyclic.components.find((item) => item.componentId === section.componentId)!.parentId =
      light.componentId;
    expect(validateDashboardProject(cyclic).issues.map((issue) => issue.message)).toContain(
      "Nested component hierarchy contains a cycle.",
    );
  });

  it("duplicates and deletes complete container subtrees", () => {
    useEditorStore.getState().addComponent("container", { x: 0, y: 5, w: 6, h: 6 });
    const container = useEditorStore.getState().project.components.at(-1)!;
    useEditorStore
      .getState()
      .addComponent("sensor-card", { x: 0, y: 0, w: 4, h: 2 }, container.componentId);
    const child = useEditorStore.getState().project.components.at(-1)!;

    expect(
      getDescendantIds(useEditorStore.getState().project.components, [container.componentId]),
    ).toEqual(new Set([container.componentId, child.componentId]));

    useEditorStore.getState().selectComponent(container.componentId);
    useEditorStore.getState().duplicateSelected();
    const duplicatedIds = useEditorStore.getState().selectedIds;
    const duplicated = useEditorStore
      .getState()
      .project.components.filter((component) => duplicatedIds.includes(component.componentId));
    expect(duplicated).toHaveLength(2);
    const duplicatedContainer = duplicated.find((component) => component.type === "container")!;
    expect(
      duplicated.find((component) => component.parentId === duplicatedContainer.componentId),
    ).toBeDefined();

    useEditorStore.getState().selectComponent(container.componentId);
    useEditorStore.getState().deleteSelected();
    const remainingIds = new Set(
      useEditorStore.getState().project.components.map((component) => component.componentId),
    );
    expect(remainingIds.has(container.componentId)).toBe(false);
    expect(remainingIds.has(child.componentId)).toBe(false);
  });
});
