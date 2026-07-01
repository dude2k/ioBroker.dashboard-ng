import type { DashboardBreakpoint, DashboardComponent, GridPlacement } from "@dashboard-ng/shared";

export const runtimeColumns: Record<DashboardBreakpoint, number> = {
  phone: 4,
  tablet: 8,
  desktop: 12,
  wall: 12,
};

export const runtimeCellSize: Record<DashboardBreakpoint, number> = {
  phone: 58,
  tablet: 64,
  desktop: 72,
  wall: 78,
};

export function resolveComponentPlacement(
  component: DashboardComponent,
  breakpoint: DashboardBreakpoint,
): GridPlacement {
  return (
    component.layout[breakpoint] ??
    component.layout.desktop ??
    component.layout.tablet ??
    component.layout.phone ?? { x: 0, y: 0, w: 2, h: 2 }
  );
}

export function clampGridPlacement(placement: GridPlacement, columns: number): GridPlacement {
  const width = Math.max(1, Math.min(placement.w, columns));
  return {
    x: Math.max(0, Math.min(placement.x, columns - width)),
    y: Math.max(0, placement.y),
    w: width,
    h: Math.max(1, placement.h),
  };
}

export function getGridBottom(
  components: DashboardComponent[],
  breakpoint: DashboardBreakpoint,
): number {
  return components.reduce((max, component) => {
    const placement = resolveComponentPlacement(component, breakpoint);
    return Math.max(max, placement.y + placement.h);
  }, 0);
}
