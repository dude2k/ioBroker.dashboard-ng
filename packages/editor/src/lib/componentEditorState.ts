import type { DashboardComponent } from "@dashboard-ng/shared";

const EDITOR_LOCKED_KEY = "editorLocked";
const EDITOR_HIDDEN_KEY = "editorHidden";

export function isEditorLocked(component: DashboardComponent): boolean {
  return component.style[EDITOR_LOCKED_KEY] === true;
}

export function isEditorHidden(component: DashboardComponent): boolean {
  return component.style[EDITOR_HIDDEN_KEY] === true;
}

export function setEditorLocked(
  style: Record<string, unknown>,
  locked: boolean,
): Record<string, unknown> {
  return setEditorFlag(style, EDITOR_LOCKED_KEY, locked);
}

export function setEditorHidden(
  style: Record<string, unknown>,
  hidden: boolean,
): Record<string, unknown> {
  return setEditorFlag(style, EDITOR_HIDDEN_KEY, hidden);
}

export function clearEditorInteractionFlags(
  style: Record<string, unknown>,
): Record<string, unknown> {
  const nextStyle = { ...style };
  delete nextStyle[EDITOR_LOCKED_KEY];
  delete nextStyle[EDITOR_HIDDEN_KEY];
  return nextStyle;
}

function setEditorFlag(
  style: Record<string, unknown>,
  key: string,
  enabled: boolean,
): Record<string, unknown> {
  const nextStyle = { ...style };
  if (enabled) {
    nextStyle[key] = true;
  } else {
    delete nextStyle[key];
  }
  return nextStyle;
}
