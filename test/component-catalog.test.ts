import { describe, expect, it } from "vitest";
import {
  componentCatalog,
  createComponentFromCatalog,
  createDefaultDashboard,
  type ComponentType,
  validateDashboardProject,
} from "@dashboard-ng/shared";

const publicRuntimeCards: ComponentType[] = [
  "light-card",
  "sensor-card",
  "scene-button",
  "room-card",
  "thermostat-card",
  "blind-card",
  "energy-card",
  "mini-chart-card",
  "camera-card",
];

describe("component catalog", () => {
  it("marks every public AP2 runtime card as implemented with usable defaults", () => {
    publicRuntimeCards.forEach((type) => {
      const entry = componentCatalog.find((item) => item.type === type);

      expect(entry, type).toBeDefined();
      expect(entry?.implemented, type).toBe(true);
      expect(entry?.defaultSize.w, type).toBeGreaterThan(0);
      expect(entry?.defaultSize.h, type).toBeGreaterThan(0);
      expect(entry?.defaultProps.title, type).toEqual(expect.any(String));
      expect(String(entry?.defaultProps.title), type).not.toHaveLength(0);
    });
  });

  it("creates schema-compatible dashboard components for every public runtime card", () => {
    const project = createDefaultDashboard({ now: "2026-07-01T00:00:00.000Z" });
    const page = project.pages[0];

    expect(page).toBeDefined();

    publicRuntimeCards.forEach((type, index) => {
      const entry = componentCatalog.find((item) => item.type === type);
      expect(entry).toBeDefined();

      const component = createComponentFromCatalog(type, `cmp-ap2-${type}`, page!.pageId, {
        x: 0,
        y: 10 + index * 4,
        w: entry!.defaultSize.w,
        h: entry!.defaultSize.h,
      });

      project.components.push(component);
      page!.componentIds.push(component.componentId);
    });

    expect(validateDashboardProject(project).valid).toBe(true);
  });
});
