import {
  componentCatalog,
  getCatalogEntry,
  type ComponentType,
  type GridPlacement,
} from "@dashboard-ng/shared";
import { clampGridPlacement } from "@dashboard-ng/runtime";

export const DASHBOARD_COMPONENT_MIME = "application/dashboard-ng-component";

interface ComponentDragPayload {
  type: ComponentType;
}

interface DropPlacementInput {
  clientX: number;
  clientY: number;
  rect: Pick<DOMRect, "left" | "top">;
  cell: number;
  columns: number;
  defaultSize: Pick<GridPlacement, "w" | "h">;
}

export function createComponentDragPayload(type: ComponentType): string {
  return JSON.stringify({ type } satisfies ComponentDragPayload);
}

export function readComponentDragType(
  dataTransfer: Pick<DataTransfer, "getData">,
): ComponentType | undefined {
  const raw = dataTransfer.getData(DASHBOARD_COMPONENT_MIME) || dataTransfer.getData("text/plain");
  if (!raw) {
    return undefined;
  }

  try {
    const payload = JSON.parse(raw) as Partial<ComponentDragPayload>;
    if (typeof payload.type === "string" && isCatalogComponentType(payload.type)) {
      return payload.type;
    }
  } catch {
    return isCatalogComponentType(raw) ? raw : undefined;
  }

  return undefined;
}

export function getCatalogDropPlacement(
  type: ComponentType,
  input: Omit<DropPlacementInput, "defaultSize">,
): GridPlacement {
  const entry = getCatalogEntry(type);
  return getDropPlacement({ ...input, defaultSize: entry.defaultSize });
}

export function getDropPlacement(input: DropPlacementInput): GridPlacement {
  const x = Math.max(0, Math.floor((input.clientX - input.rect.left) / input.cell));
  const y = Math.max(0, Math.floor((input.clientY - input.rect.top) / input.cell));

  return clampGridPlacement(
    {
      x,
      y,
      w: input.defaultSize.w,
      h: input.defaultSize.h,
    },
    input.columns,
  );
}

function isCatalogComponentType(value: string): value is ComponentType {
  return componentCatalog.some((entry) => entry.type === value);
}
