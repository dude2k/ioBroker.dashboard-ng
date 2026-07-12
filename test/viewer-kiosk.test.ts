import { describe, expect, it } from "vitest";
import { createDefaultDashboard } from "../packages/shared/src";
import {
  canRequestWakeLock,
  getBurnInOffset,
  isKioskEnabled,
} from "../packages/viewer/src/lib/kiosk";

describe("viewer kiosk behavior", () => {
  it("uses project or page kiosk settings", () => {
    const project = createDefaultDashboard();
    const page = project.pages[0]!;

    expect(isKioskEnabled(project, page)).toBe(true);
    project.settings.kiosk = false;
    page.settings.kiosk = false;
    expect(isKioskEnabled(project, page)).toBe(false);
    page.settings.kiosk = true;
    expect(isKioskEnabled(project, page)).toBe(true);
  });

  it("moves burn-in protection through a subtle bounded sequence", () => {
    const positions = Array.from({ length: 5 }, (_, index) => getBurnInOffset(index));

    expect(positions).toContainEqual({ x: 0, y: 0 });
    expect(
      positions.every((position) => Math.abs(position.x) <= 2 && Math.abs(position.y) <= 2),
    ).toBe(true);
    expect(getBurnInOffset(5)).toEqual(getBurnInOffset(0));
  });

  it("requests Wake Lock only when enabled, visible and supported", () => {
    expect(canRequestWakeLock(true, true, true)).toBe(true);
    expect(canRequestWakeLock(false, true, true)).toBe(false);
    expect(canRequestWakeLock(true, false, true)).toBe(false);
    expect(canRequestWakeLock(true, true, false)).toBe(false);
  });
});
