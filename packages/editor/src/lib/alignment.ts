import type { GridPlacement } from "@dashboard-ng/shared";

export type AlignmentMode = "left" | "center" | "right" | "top" | "middle" | "bottom";
export type DistributionAxis = "horizontal" | "vertical";

export interface PlacementItem {
  id: string;
  placement: GridPlacement;
}

export function alignPlacements(
  items: PlacementItem[],
  mode: AlignmentMode,
  columns: number,
): Map<string, GridPlacement> {
  const result = new Map<string, GridPlacement>();
  if (items.length < 2) return result;
  const minX = Math.min(...items.map((item) => item.placement.x));
  const maxX = Math.max(...items.map((item) => item.placement.x + item.placement.w));
  const minY = Math.min(...items.map((item) => item.placement.y));
  const maxY = Math.max(...items.map((item) => item.placement.y + item.placement.h));

  items.forEach(({ id, placement }) => {
    let x = placement.x;
    let y = placement.y;
    if (mode === "left") x = minX;
    if (mode === "center") x = Math.round((minX + maxX - placement.w) / 2);
    if (mode === "right") x = maxX - placement.w;
    if (mode === "top") y = minY;
    if (mode === "middle") y = Math.round((minY + maxY - placement.h) / 2);
    if (mode === "bottom") y = maxY - placement.h;
    result.set(id, {
      ...placement,
      x: Math.max(0, Math.min(columns - placement.w, x)),
      y: Math.max(0, y),
    });
  });
  return result;
}

export function distributePlacements(
  items: PlacementItem[],
  axis: DistributionAxis,
  columns: number,
): Map<string, GridPlacement> {
  const result = new Map<string, GridPlacement>();
  if (items.length < 3) return result;
  const horizontal = axis === "horizontal";
  const sorted = [...items].sort((left, right) =>
    horizontal ? left.placement.x - right.placement.x : left.placement.y - right.placement.y,
  );
  const first = sorted[0]!.placement;
  const last = sorted.at(-1)!.placement;
  const start = horizontal ? first.x : first.y;
  const end = horizontal ? last.x + last.w : last.y + last.h;
  const totalSize = sorted.reduce(
    (sum, item) => sum + (horizontal ? item.placement.w : item.placement.h),
    0,
  );
  const gap = Math.max(0, (end - start - totalSize) / (sorted.length - 1));
  let cursor = start;
  sorted.forEach(({ id, placement }) => {
    const next = horizontal
      ? { ...placement, x: Math.max(0, Math.min(columns - placement.w, Math.round(cursor))) }
      : { ...placement, y: Math.max(0, Math.round(cursor)) };
    result.set(id, next);
    cursor += (horizontal ? placement.w : placement.h) + gap;
  });
  return result;
}
