import type { DashboardProject, Page } from "@dashboard-ng/shared";

export function isKioskEnabled(
  project: DashboardProject | undefined,
  page: Page | undefined,
): boolean {
  return Boolean(project?.settings.kiosk || page?.settings.kiosk);
}

export function getBurnInOffset(tick: number): { x: number; y: number } {
  const positions = [
    { x: 0, y: 0 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: 2, y: 1 },
    { x: -2, y: -1 },
  ];
  return positions[Math.abs(tick) % positions.length] ?? { x: 0, y: 0 };
}

export function canRequestWakeLock(
  enabled: boolean,
  visible: boolean,
  supported: boolean,
): boolean {
  return enabled && visible && supported;
}
