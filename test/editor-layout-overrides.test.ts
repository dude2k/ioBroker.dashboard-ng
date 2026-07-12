import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultDashboard } from "../packages/shared/src";
import { getPlacement, useEditorStore } from "../packages/editor/src/store/editorStore";

describe("advanced layout overrides", () => {
  beforeEach(() => {
    useEditorStore.getState().setProject(createDefaultDashboard(), "Reset");
  });

  it("stores exact breakpoint values and clamps them to Viewer columns", () => {
    const component = useEditorStore.getState().project.components[0]!;

    useEditorStore
      .getState()
      .moveComponent(component.componentId, { x: 8, y: 7, w: 4, h: 5 }, "phone");

    expect(
      useEditorStore
        .getState()
        .project.components.find((item) => item.componentId === component.componentId)?.layout
        .phone,
    ).toEqual({ x: 0, y: 7, w: 4, h: 5 });
  });

  it("clears one breakpoint override and falls back without losing other layouts", () => {
    const component = useEditorStore.getState().project.components[0]!;
    const desktop = component.layout.desktop;

    useEditorStore.getState().clearComponentLayout(component.componentId, "phone");
    const updated = useEditorStore
      .getState()
      .project.components.find((item) => item.componentId === component.componentId)!;

    expect(updated.layout.phone).toBeUndefined();
    expect(getPlacement(updated, "phone")).toEqual(desktop);
    expect(updated.layout.desktop).toEqual(desktop);
  });

  it("keeps the final remaining layout value", () => {
    const component = useEditorStore.getState().project.components[0]!;
    useEditorStore.getState().clearComponentLayout(component.componentId, "phone");
    useEditorStore.getState().clearComponentLayout(component.componentId, "tablet");
    useEditorStore.getState().clearComponentLayout(component.componentId, "wall");
    useEditorStore.getState().clearComponentLayout(component.componentId, "desktop");

    const updated = useEditorStore
      .getState()
      .project.components.find((item) => item.componentId === component.componentId)!;
    expect(Object.keys(updated.layout)).toEqual(["desktop"]);
    expect(useEditorStore.getState().status).toBe("Keep at least one layout value");
  });
});
