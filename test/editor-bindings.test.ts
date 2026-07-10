import { beforeEach, describe, expect, it } from "vitest";
import {
  createDefaultDashboard,
  validateDashboardProject,
  type DeviceMapping,
} from "@dashboard-ng/shared";
import { getComponentBinding, useEditorStore } from "../packages/editor/src/store/editorStore";

describe("editor component bindings", () => {
  beforeEach(() => {
    useEditorStore
      .getState()
      .setProject(createDefaultDashboard({ now: "2026-07-02T00:00:00.000Z" }), "Test");
  });

  it("sets and updates bindings for explicit component targets", () => {
    useEditorStore.getState().addComponent("camera-card");
    const componentId = useEditorStore.getState().selectedIds[0]!;

    useEditorStore
      .getState()
      .setComponentBinding(componentId, "imageUrl", "alias.0.camera.snapshot", "read");

    const project = useEditorStore.getState().project;
    const component = project.components.find((item) => item.componentId === componentId)!;
    const binding = getComponentBinding(project, component, "imageUrl");

    expect(binding?.target).toBe("imageUrl");
    expect(binding?.stateId).toBe("alias.0.camera.snapshot");
    expect(component.bindingIds).toEqual([binding?.bindingId]);
    expect(validateDashboardProject(project).valid).toBe(true);
  });

  it("keeps generated light actions aligned with value bindings", () => {
    useEditorStore.getState().addComponent("light-card");
    const componentId = useEditorStore.getState().selectedIds[0]!;

    useEditorStore.getState().setComponentBinding(componentId, "value", "alias.0.light", "read");
    useEditorStore
      .getState()
      .setComponentBinding(componentId, "value", "alias.0.light", "readwrite");

    let project = useEditorStore.getState().project;
    let component = project.components.find((item) => item.componentId === componentId)!;
    let binding = getComponentBinding(project, component, "value");

    expect(binding?.mode).toBe("readwrite");
    expect(project.actions.filter((action) => action.componentId === componentId)).toEqual([
      expect.objectContaining({ steps: [{ kind: "toggleState", stateId: "alias.0.light" }] }),
    ]);

    useEditorStore
      .getState()
      .setComponentFormulaBinding(componentId, "value", "alias.0.light", "value == true");
    expect(
      useEditorStore
        .getState()
        .project.actions.filter((action) => action.componentId === componentId),
    ).toEqual([]);

    useEditorStore.getState().removeComponentBinding(componentId, "value");

    project = useEditorStore.getState().project;
    component = project.components.find((item) => item.componentId === componentId)!;
    binding = getComponentBinding(project, component, "value");

    expect(binding).toBeUndefined();
    expect(component.bindingIds).toEqual([]);
    expect(component.actionIds).toEqual([]);
    expect(project.actions.filter((action) => action.componentId === componentId)).toEqual([]);
  });

  it("stores and clears binding transforms", () => {
    useEditorStore.getState().addComponent("energy-card");
    const componentId = useEditorStore.getState().selectedIds[0]!;
    useEditorStore.getState().setComponentBinding(componentId, "value", "alias.0.energy", "read");
    useEditorStore.getState().setComponentBindingTransform(componentId, "value", {
      formula: "value / 1000",
      format: "energy",
      decimals: 2,
    });

    let project = useEditorStore.getState().project;
    let component = project.components.find((item) => item.componentId === componentId)!;
    expect(getComponentBinding(project, component, "value")?.transform).toEqual({
      formula: "value / 1000",
      format: "energy",
      decimals: 2,
    });

    useEditorStore.getState().setComponentBindingTransform(componentId, "value", undefined);
    project = useEditorStore.getState().project;
    component = project.components.find((item) => item.componentId === componentId)!;
    expect(getComponentBinding(project, component, "value")?.transform).toBeUndefined();
  });

  it("prefills related device bindings without replacing manual corrections", () => {
    useEditorStore.getState().addComponent("thermostat-card");
    const componentId = useEditorStore.getState().selectedIds[0]!;
    useEditorStore
      .getState()
      .setComponentBinding(componentId, "value", "manual.0.temperature", "read");
    const mapping: DeviceMapping = {
      kind: "thermostat",
      confidence: "high",
      rootId: "hm.0.thermostat",
      name: "Thermostat",
      bindings: [
        { target: "value", stateId: "hm.0.thermostat.actual", mode: "read" },
        { target: "target", stateId: "hm.0.thermostat.setpoint", mode: "readwrite" },
      ],
    };

    useEditorStore.getState().applyComponentDeviceMapping(componentId, mapping);

    const project = useEditorStore.getState().project;
    const component = project.components.find((item) => item.componentId === componentId)!;
    expect(getComponentBinding(project, component, "value")?.stateId).toBe("manual.0.temperature");
    expect(getComponentBinding(project, component, "target")?.stateId).toBe(
      "hm.0.thermostat.setpoint",
    );
    expect(validateDashboardProject(project).valid).toBe(true);
  });
});
