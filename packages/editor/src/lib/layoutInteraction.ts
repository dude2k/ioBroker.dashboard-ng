import type { GridPlacement } from "@dashboard-ng/shared";
import { clampGridPlacement } from "@dashboard-ng/runtime";

export type ResizeHandle = "east" | "south" | "south-east";

export interface GridDelta {
  x: number;
  y: number;
}

interface PointerDeltaInput {
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
  cell: number;
}

export function getPointerGridDelta(input: PointerDeltaInput): GridDelta {
  return {
    x: Math.round((input.currentClientX - input.startClientX) / input.cell),
    y: Math.round((input.currentClientY - input.startClientY) / input.cell),
  };
}

export function moveGridPlacement(
  placement: GridPlacement,
  delta: GridDelta,
  columns: number,
): GridPlacement {
  return clampGridPlacement(
    {
      ...placement,
      x: placement.x + delta.x,
      y: placement.y + delta.y,
    },
    columns,
  );
}

export function resizeGridPlacement(
  placement: GridPlacement,
  handle: ResizeHandle,
  delta: GridDelta,
  columns: number,
): GridPlacement {
  const maxWidth = Math.max(1, columns - placement.x);
  const nextWidth =
    handle === "east" || handle === "south-east"
      ? Math.max(1, Math.min(placement.w + delta.x, maxWidth))
      : placement.w;
  const nextHeight =
    handle === "south" || handle === "south-east"
      ? Math.max(1, placement.h + delta.y)
      : placement.h;

  return {
    ...placement,
    w: nextWidth,
    h: nextHeight,
  };
}

export function placementsEqual(left: GridPlacement, right: GridPlacement): boolean {
  return left.x === right.x && left.y === right.y && left.w === right.w && left.h === right.h;
}
