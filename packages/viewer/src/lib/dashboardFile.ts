import { sanitizeDashboardFilePart } from "@dashboard-ng/shared";

export function createDashboardFileUrl(
  dashboardId: string,
  currentHref: string,
  cacheBust: number,
): string {
  const safeDashboardId = sanitizeDashboardFilePart(dashboardId);
  const url = new URL(`dashboards/${safeDashboardId}.json`, currentHref);
  url.searchParams.set("_", String(cacheBust));
  return url.toString();
}
