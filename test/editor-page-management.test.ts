import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultDashboard, validateDashboardProject } from "@dashboard-ng/shared";
import { useEditorStore } from "../packages/editor/src/store/editorStore";

describe("editor page management", () => {
  beforeEach(() => {
    useEditorStore
      .getState()
      .setProject(createDefaultDashboard({ now: "2026-07-01T00:00:00.000Z" }), "Test");
  });

  it("creates, switches and renames pages without selecting components", () => {
    const store = useEditorStore.getState();

    store.createPage("Kitchen");
    let project = useEditorStore.getState().project;
    const kitchen = project.pages.find((page) => page.name === "Kitchen");

    expect(kitchen).toBeDefined();
    expect(project.settings.activePageId).toBe(kitchen?.pageId);
    expect(useEditorStore.getState().selectedIds).toEqual([]);

    useEditorStore.getState().switchPage("page-home");
    expect(useEditorStore.getState().project.settings.activePageId).toBe("page-home");

    useEditorStore.getState().renamePage(kitchen!.pageId, "Kitchen Main");
    project = useEditorStore.getState().project;
    expect(project.pages.find((page) => page.pageId === kitchen!.pageId)?.name).toBe(
      "Kitchen Main",
    );
    expect(validateDashboardProject(project).valid).toBe(true);
  });

  it("duplicates pages with independent components, bindings and actions", () => {
    const original = useEditorStore.getState().project;
    const sourcePage = original.pages[0]!;
    const sourceComponentIds = new Set(sourcePage.componentIds);

    useEditorStore.getState().duplicatePage(sourcePage.pageId);

    const project = useEditorStore.getState().project;
    const copiedPage = project.pages.find((page) => page.pageId !== sourcePage.pageId);

    expect(copiedPage).toBeDefined();
    expect(copiedPage?.componentIds).toHaveLength(sourcePage.componentIds.length);
    expect(copiedPage?.componentIds.some((id) => sourceComponentIds.has(id))).toBe(false);
    expect(project.settings.activePageId).toBe(copiedPage?.pageId);
    expect(validateDashboardProject(project).valid).toBe(true);
  });

  it("deletes a page with its component references but keeps one page", () => {
    useEditorStore.getState().createPage("Temporary");
    const temporaryPageId = useEditorStore.getState().project.settings.activePageId;
    useEditorStore.getState().addComponent("sensor-card");
    const temporaryComponentIds = new Set(
      useEditorStore
        .getState()
        .project.components.filter((component) => component.pageId === temporaryPageId)
        .map((component) => component.componentId),
    );

    useEditorStore.getState().deletePage(temporaryPageId);

    const project = useEditorStore.getState().project;
    expect(project.pages.some((page) => page.pageId === temporaryPageId)).toBe(false);
    expect(
      project.components.some((component) => temporaryComponentIds.has(component.componentId)),
    ).toBe(false);
    expect(project.pages).toHaveLength(1);
    expect(project.settings.activePageId).toBe(project.pages[0]?.pageId);
    expect(validateDashboardProject(project).valid).toBe(true);

    useEditorStore.getState().deletePage(project.pages[0]!.pageId);
    expect(useEditorStore.getState().project.pages).toHaveLength(1);
    expect(useEditorStore.getState().status).toBe("Keep at least one page");
  });
});
