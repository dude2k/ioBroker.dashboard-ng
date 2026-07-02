import { describe, expect, it } from "vitest";
import { sanitizeDashboardFilePart } from "../packages/shared/src";
import { createDashboardFileUrl } from "../packages/viewer/src/lib/dashboardFile";

describe("dashboard file urls", () => {
  it("uses the web adapter dashboard namespace with cache busting", () => {
    expect(
      createDashboardFileUrl("default", "http://example.local:8082/dashboard-ng/index.html", 123),
    ).toBe("http://example.local:8082/dashboard-ng/dashboards/default.json?_=123");
  });

  it("sanitizes dashboard ids consistently for adapter storage and viewer fetches", () => {
    expect(sanitizeDashboardFilePart("Floor 1/Main")).toBe("Floor_1_Main");
    expect(
      createDashboardFileUrl(
        "Floor 1/Main",
        "http://example.local:8082/dashboard-ng/index.html",
        123,
      ),
    ).toBe("http://example.local:8082/dashboard-ng/dashboards/Floor_1_Main.json?_=123");
  });
});
