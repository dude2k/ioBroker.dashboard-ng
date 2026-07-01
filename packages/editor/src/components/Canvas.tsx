import { Copy, Grip, Pencil, Plus, Trash2 } from "lucide-react";
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
  const switchPage = useEditorStore((state) => state.switchPage);
  const createPage = useEditorStore((state) => state.createPage);
  const renamePage = useEditorStore((state) => state.renamePage);
  const duplicatePage = useEditorStore((state) => state.duplicatePage);
  const deletePage = useEditorStore((state) => state.deletePage);
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
        <div className="page-tab-list" role="tablist" aria-label="Dashboard pages">
          {project.pages.map((candidate) => (
            <button
              aria-selected={candidate.pageId === page.pageId}
              className={candidate.pageId === page.pageId ? "page-tab is-active" : "page-tab"}
              key={candidate.pageId}
              role="tab"
              title={candidate.name}
              onClick={() => switchPage(candidate.pageId)}
            >
              {candidate.name}
            </button>
          ))}
        </div>
        <div className="page-actions" aria-label="Page actions">
          <button title="Add page" onClick={() => createPage()}>
            <Plus size={15} aria-hidden="true" />
          </button>
          <button
            title="Rename page"
            onClick={() => {
              const name = window.prompt("Page name", page.name);
              if (name !== null) {
                renamePage(page.pageId, name);
              }
            }}
          >
            <Pencil size={15} aria-hidden="true" />
          </button>
          <button title="Duplicate page" onClick={() => duplicatePage(page.pageId)}>
            <Copy size={15} aria-hidden="true" />
          </button>
          <button
            disabled={project.pages.length <= 1}
            title="Delete page"
            onClick={() => {
              if (window.confirm(`Delete page "${page.name}"?`)) {
                deletePage(page.pageId);
              }
            }}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
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
