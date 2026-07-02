import { describe, expect, it } from "vitest";
import {
  getPreviewViewport,
  previewDevices,
  previewOrientations,
  togglePreviewOrientation,
} from "../packages/editor/src/lib/preview";
import { useEditorStore } from "../packages/editor/src/store/editorStore";

describe("editor responsive preview", () => {
  it("defines portrait and landscape viewports for every preview device", () => {
    previewDevices.forEach((device) => {
      previewOrientations.forEach((orientation) => {
        const viewport = getPreviewViewport(device, orientation);

        expect(viewport.device).toBe(device);
        expect(viewport.orientation).toBe(orientation);
        expect(viewport.columns).toBeGreaterThan(0);
        expect(viewport.cell).toBeGreaterThan(0);
        expect(viewport.width).toBe(viewport.columns * viewport.cell);
        expect(viewport.label).toContain(device[0]!.toUpperCase() + device.slice(1));
      });
    });
  });

  it("uses taller portrait frames and wider landscape frames", () => {
    previewDevices.forEach((device) => {
      const portrait = getPreviewViewport(device, "portrait");
      const landscape = getPreviewViewport(device, "landscape");

      expect(portrait.height).toBeGreaterThan(portrait.width);
      expect(landscape.width).toBeGreaterThan(landscape.height);
    });
  });

  it("toggles orientation deterministically", () => {
    expect(togglePreviewOrientation("portrait")).toBe("landscape");
    expect(togglePreviewOrientation("landscape")).toBe("portrait");
  });

  it("stores preview device and orientation independently", () => {
    useEditorStore.getState().setPreview("phone");
    useEditorStore.getState().setPreviewOrientation("portrait");

    expect(useEditorStore.getState().preview).toBe("phone");
    expect(useEditorStore.getState().previewOrientation).toBe("portrait");

    useEditorStore.getState().togglePreviewOrientation();
    expect(useEditorStore.getState().preview).toBe("phone");
    expect(useEditorStore.getState().previewOrientation).toBe("landscape");
  });
});
