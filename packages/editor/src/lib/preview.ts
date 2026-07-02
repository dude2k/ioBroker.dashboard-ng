import type { DashboardBreakpoint } from "@dashboard-ng/shared";

export type PreviewDevice = DashboardBreakpoint;
export type PreviewOrientation = "portrait" | "landscape";

export interface PreviewViewport {
  device: PreviewDevice;
  orientation: PreviewOrientation;
  breakpoint: DashboardBreakpoint;
  columns: number;
  cell: number;
  width: number;
  height: number;
  label: string;
}

const previewMatrix: Record<PreviewDevice, Record<PreviewOrientation, PreviewViewport>> = {
  phone: {
    portrait: {
      device: "phone",
      orientation: "portrait",
      breakpoint: "phone",
      columns: 4,
      cell: 72,
      width: 288,
      height: 640,
      label: "Phone portrait",
    },
    landscape: {
      device: "phone",
      orientation: "landscape",
      breakpoint: "phone",
      columns: 8,
      cell: 64,
      width: 512,
      height: 320,
      label: "Phone landscape",
    },
  },
  tablet: {
    portrait: {
      device: "tablet",
      orientation: "portrait",
      breakpoint: "tablet",
      columns: 8,
      cell: 72,
      width: 576,
      height: 840,
      label: "Tablet portrait",
    },
    landscape: {
      device: "tablet",
      orientation: "landscape",
      breakpoint: "tablet",
      columns: 12,
      cell: 64,
      width: 768,
      height: 540,
      label: "Tablet landscape",
    },
  },
  desktop: {
    portrait: {
      device: "desktop",
      orientation: "portrait",
      breakpoint: "desktop",
      columns: 10,
      cell: 72,
      width: 720,
      height: 900,
      label: "Desktop portrait",
    },
    landscape: {
      device: "desktop",
      orientation: "landscape",
      breakpoint: "desktop",
      columns: 12,
      cell: 72,
      width: 864,
      height: 620,
      label: "Desktop landscape",
    },
  },
  wall: {
    portrait: {
      device: "wall",
      orientation: "portrait",
      breakpoint: "wall",
      columns: 8,
      cell: 78,
      width: 624,
      height: 1040,
      label: "Wall portrait",
    },
    landscape: {
      device: "wall",
      orientation: "landscape",
      breakpoint: "wall",
      columns: 12,
      cell: 78,
      width: 936,
      height: 640,
      label: "Wall landscape",
    },
  },
};

export const previewDevices: PreviewDevice[] = ["phone", "tablet", "desktop", "wall"];
export const previewOrientations: PreviewOrientation[] = ["portrait", "landscape"];

export function getPreviewViewport(
  device: PreviewDevice,
  orientation: PreviewOrientation,
): PreviewViewport {
  return previewMatrix[device][orientation];
}

export function togglePreviewOrientation(orientation: PreviewOrientation): PreviewOrientation {
  return orientation === "portrait" ? "landscape" : "portrait";
}
