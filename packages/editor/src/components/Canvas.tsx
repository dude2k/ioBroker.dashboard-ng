import { Grip } from "lucide-react";
import type { ComponentType, DashboardComponent, GridPlacement } from "@dashboard-ng/shared";
import {
  DashboardRuntimeCard,
  clampGridPlacement,
  getGridBottom,
  resolveComponentPlacement,
  runtimeCellSize,
  runtimeColumns,
} from "@dashboard-ng/runtime";
import { getActivePage, getComponentBinding, useEditorStore } from "../store/editorStore";
import { dashboardClient } from "../lib/client";

export function Canvas() {
  const project = useEditorStore((state) => state.project);
  const preview = useEditorStore((state) => state.preview);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const selectComponent = useEditorStore((state) => state.selectComponent);
  const addComponent = useEditorStore((state) => state.addComponent);
  const moveComponent = useEditorStore((state) => state.moveComponent);
  const stateValues = useEditorStore((state) => state.stateValues);
  const page = getActivePage(project);
  const columns = runtimeColumns[preview];
  const cell = runtimeCellSize[preview];

  if (!page) {
    return <main className="canvas-shell">No page</main>;
  }

  const components = project.components.filter((component) => component.pageId === page.pageId);
  const height = Math.max(520, (getGridBottom(components, preview) + 2) * cell);

  return (
    <main className={`canvas-shell preview-${preview}`}>
      <div className="page-tabs">
        {project.pages.map((candidate) => (
          <button
            className={candidate.pageId === page.pageId ? "page-tab is-active" : "page-tab"}
            key={candidate.pageId}
          >
            {candidate.name}
          </button>
        ))}
      </div>
      <div
        className="dashboard-canvas"
        style={{
          width: columns * cell,
          minHeight: height,
          backgroundSize: `${cell}px ${cell}px`,
        }}
        onClick={() => useEditorStore.getState().clearSelection()}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          event.preventDefault();
          const type = event.dataTransfer.getData(
            "application/dashboard-ng-component",
          ) as ComponentType;
          if (!type) {
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          const x = Math.max(
            0,
            Math.min(columns - 1, Math.floor((event.clientX - rect.left) / cell)),
          );
          const y = Math.max(0, Math.floor((event.clientY - rect.top) / cell));
          addComponent(type, { x, y, w: Math.min(3, columns - x), h: 2 });
        }}
      >
        {components.map((component) => {
          const placement = clampGridPlacement(
            resolveComponentPlacement(component, preview),
            columns,
          );
          const binding = getComponentBinding(project, component);
          return (
            <ComponentTile
              bindingMissing={Boolean(binding?.missing)}
              bindings={project.bindings.filter(
                (item) => item.componentId === component.componentId,
              )}
              component={component}
              actions={project.actions.filter((item) => item.componentId === component.componentId)}
              isSelected={selectedIds.includes(component.componentId)}
              key={component.componentId}
              onPointerDown={(event) => {
                event.stopPropagation();
                selectComponent(component.componentId, event.shiftKey);
                startDrag(event, component, placement, cell, columns, moveComponent);
              }}
              placement={placement}
              stateValues={stateValues}
            />
          );
        })}
      </div>
    </main>
  );
}

interface ComponentTileProps {
  component: DashboardComponent;
  placement: GridPlacement;
  isSelected: boolean;
  bindingMissing: boolean;
  bindings: ReturnType<typeof useEditorStore.getState>["project"]["bindings"];
  actions: ReturnType<typeof useEditorStore.getState>["project"]["actions"];
  stateValues: ReturnType<typeof useEditorStore.getState>["stateValues"];
  onPointerDown(event: React.PointerEvent<HTMLDivElement>): void;
}

function ComponentTile({
  component,
  placement,
  isSelected,
  bindingMissing,
  bindings,
  actions,
  stateValues,
  onPointerDown,
}: ComponentTileProps) {
  const setStateValues = useEditorStore((state) => state.setStateValues);
  return (
    <div
      className={`component-tile ${isSelected ? "is-selected" : ""} ${bindingMissing ? "has-missing" : ""}`}
      style={{
        gridColumn: `${placement.x + 1} / span ${placement.w}`,
        gridRow: `${placement.y + 1} / span ${placement.h}`,
      }}
      onPointerDown={onPointerDown}
    >
      <div className="tile-grip">
        <Grip size={14} aria-hidden="true" />
      </div>
      <DashboardRuntimeCard
        actions={actions}
        bindings={bindings}
        component={component}
        mode="editor"
        stateValues={stateValues}
        onLocalStateChange={(stateId, value) =>
          setStateValues({ ...useEditorStore.getState().stateValues, [stateId]: value })
        }
        onWriteState={async (stateId, value) => {
          await dashboardClient.writeState(stateId, value);
        }}
      />
    </div>
  );
}

function startDrag(
  event: React.PointerEvent<HTMLDivElement>,
  component: DashboardComponent,
  placement: GridPlacement,
  cell: number,
  columns: number,
  moveComponent: (componentId: string, placement: GridPlacement) => void,
): void {
  const startX = event.clientX;
  const startY = event.clientY;

  function onMove(moveEvent: PointerEvent) {
    const deltaX = Math.round((moveEvent.clientX - startX) / cell);
    const deltaY = Math.round((moveEvent.clientY - startY) / cell);
    moveComponent(
      component.componentId,
      clampGridPlacement(
        {
          ...placement,
          x: placement.x + deltaX,
          y: placement.y + deltaY,
        },
        columns,
      ),
    );
  }

  function onUp() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  }

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}
