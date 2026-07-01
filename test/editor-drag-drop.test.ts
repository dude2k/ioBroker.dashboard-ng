import { describe, expect, it } from "vitest";
import {
  createComponentDragPayload,
  DASHBOARD_COMPONENT_MIME,
  getCatalogDropPlacement,
  getDropPlacement,
  readComponentDragType,
} from "../packages/editor/src/lib/dragDrop";

describe("editor drag and drop", () => {
  it("round-trips component drag payloads", () => {
    const payload = createComponentDragPayload("light-card");
    const dataTransfer = {
      getData(type: string) {
        return type === DASHBOARD_COMPONENT_MIME ? payload : "";
      },
    };

    expect(readComponentDragType(dataTransfer)).toBe("light-card");
  });

  it("keeps legacy raw component drag payloads readable", () => {
    const dataTransfer = {
      getData(type: string) {
        return type === DASHBOARD_COMPONENT_MIME ? "sensor-card" : "";
      },
    };

    expect(readComponentDragType(dataTransfer)).toBe("sensor-card");
  });

  it("ignores unknown drag payloads", () => {
    const dataTransfer = {
      getData(type: string) {
        return type === "text/plain" ? "not-a-dashboard-component" : "";
      },
    };

    expect(readComponentDragType(dataTransfer)).toBeUndefined();
  });

  it("uses catalog default sizes and clamps placement to the grid", () => {
    const placement = getCatalogDropPlacement("room-card", {
      clientX: 11.6 * 72,
      clientY: 2.4 * 72,
      rect: { left: 0, top: 0 },
      cell: 72,
      columns: 12,
    });

    expect(placement).toEqual({ x: 8, y: 2, w: 4, h: 3 });
  });

  it("shrinks oversized drops to narrow preview grids", () => {
    const placement = getDropPlacement({
      clientX: 6 * 58,
      clientY: 58,
      rect: { left: 0, top: 0 },
      cell: 58,
      columns: 4,
      defaultSize: { w: 6, h: 2 },
    });

    expect(placement).toEqual({ x: 0, y: 1, w: 4, h: 2 });
  });
});
