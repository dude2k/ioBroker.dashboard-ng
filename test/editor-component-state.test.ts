import { describe, expect, it } from "vitest";
import { createComponentFromCatalog } from "@dashboard-ng/shared";
import {
  clearEditorInteractionFlags,
  isEditorHidden,
  isEditorLocked,
  setEditorHidden,
  setEditorLocked,
} from "../packages/editor/src/lib/componentEditorState";

describe("editor component state metadata", () => {
  it("stores lock and hidden state in component style metadata", () => {
    const component = createComponentFromCatalog("sensor-card", "cmp-test", "page-test", {
      x: 0,
      y: 0,
      w: 3,
      h: 2,
    });

    component.style = setEditorLocked(component.style, true);
    component.style = setEditorHidden(component.style, true);

    expect(isEditorLocked(component)).toBe(true);
    expect(isEditorHidden(component)).toBe(true);
  });

  it("removes editor flags instead of writing false values", () => {
    const style = clearEditorInteractionFlags({
      editorLocked: true,
      editorHidden: true,
      color: "accent",
    });

    expect(style).toEqual({ color: "accent" });
  });
});
