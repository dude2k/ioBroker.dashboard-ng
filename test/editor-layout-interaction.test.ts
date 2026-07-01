import { describe, expect, it } from "vitest";
import {
  getPointerGridDelta,
  moveGridPlacement,
  placementsEqual,
  resizeGridPlacement,
} from "../packages/editor/src/lib/layoutInteraction";

describe("editor layout interaction", () => {
  it("snaps pointer movement to grid cells", () => {
    expect(
      getPointerGridDelta({
        startClientX: 100,
        startClientY: 100,
        currentClientX: 209,
        currentClientY: 28,
        cell: 72,
      }),
    ).toEqual({ x: 2, y: -1 });
  });

  it("moves placements and clamps them to the active grid", () => {
    expect(moveGridPlacement({ x: 10, y: 2, w: 3, h: 2 }, { x: 2, y: -4 }, 12)).toEqual({
      x: 9,
      y: 0,
      w: 3,
      h: 2,
    });
  });

  it("resizes from the east edge without moving the origin", () => {
    expect(resizeGridPlacement({ x: 9, y: 1, w: 2, h: 2 }, "east", { x: 4, y: 5 }, 12)).toEqual({
      x: 9,
      y: 1,
      w: 3,
      h: 2,
    });
  });

  it("resizes from the south edge without changing width", () => {
    expect(resizeGridPlacement({ x: 3, y: 1, w: 4, h: 2 }, "south", { x: 3, y: 2 }, 12)).toEqual({
      x: 3,
      y: 1,
      w: 4,
      h: 4,
    });
  });

  it("resizes from the corner and keeps a one-cell minimum", () => {
    expect(
      resizeGridPlacement({ x: 2, y: 3, w: 4, h: 3 }, "south-east", { x: -8, y: -8 }, 12),
    ).toEqual({
      x: 2,
      y: 3,
      w: 1,
      h: 1,
    });
  });

  it("compares placements by grid coordinates", () => {
    expect(placementsEqual({ x: 1, y: 2, w: 3, h: 4 }, { x: 1, y: 2, w: 3, h: 4 })).toBe(true);
    expect(placementsEqual({ x: 1, y: 2, w: 3, h: 4 }, { x: 1, y: 2, w: 4, h: 4 })).toBe(false);
  });
});
