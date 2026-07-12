import { describe, expect, it } from "vitest";
import {
  alignPlacements,
  distributePlacements,
  type PlacementItem,
} from "../packages/editor/src/lib/alignment";

const items: PlacementItem[] = [
  { id: "a", placement: { x: 1, y: 1, w: 2, h: 2 } },
  { id: "b", placement: { x: 5, y: 4, w: 3, h: 3 } },
  { id: "c", placement: { x: 10, y: 9, w: 2, h: 2 } },
];

describe("alignment tools", () => {
  it("aligns every edge and center within the selected bounds", () => {
    expect([...alignPlacements(items, "left", 12).values()].map((item) => item.x)).toEqual([
      1, 1, 1,
    ]);
    expect(
      [...alignPlacements(items, "right", 12).values()].map((item) => item.x + item.w),
    ).toEqual([12, 12, 12]);
    expect([...alignPlacements(items, "top", 12).values()].map((item) => item.y)).toEqual([
      1, 1, 1,
    ]);
    expect(
      [...alignPlacements(items, "bottom", 12).values()].map((item) => item.y + item.h),
    ).toEqual([11, 11, 11]);
    expect(alignPlacements(items, "center", 12).get("b")?.x).toBe(5);
    expect(alignPlacements(items, "middle", 12).get("b")?.y).toBe(5);
  });

  it("distributes three or more components while preserving outer bounds", () => {
    const horizontal = distributePlacements(items, "horizontal", 12);
    const vertical = distributePlacements(items, "vertical", 12);

    expect(horizontal.get("a")?.x).toBe(1);
    expect(horizontal.get("c")?.x).toBe(10);
    expect(horizontal.get("b")?.x).toBe(5);
    expect(vertical.get("a")?.y).toBe(1);
    expect(vertical.get("c")?.y).toBe(9);
    expect(vertical.get("b")?.y).toBe(5);
  });
});
