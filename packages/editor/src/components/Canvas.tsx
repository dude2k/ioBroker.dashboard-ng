import { useState } from "react";
import {
  Copy,
  EyeOff,
  Grip,
  Lock,
  MoveDiagonal2,
  MoveHorizontal,
  MoveVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { DashboardComponent, GridPlacement } from "@dashboard-ng/shared";
import {
  DashboardRuntimeCard,
  clampGridPlacement,
  getGridBottom,
  resolveComponentPlacement,
} from "@dashboard-ng/runtime";
import { getActivePage, getComponentBinding, useEditorStore } from "../store/editorStore";
import { dashboardClient } from "../lib/client";
import { isEditorHidden, isEditorLocked } from "../lib/componentEditorState";
import { getCatalogDropPlacement, readComponentDragType } from "../lib/dragDrop";
import {
  getPointerGridDelta,
  moveGridPlacement,
  placementsEqual,
  resizeGridPlacement,
  type ResizeHandle,
} from "../lib/layoutInteraction";
import { getPreviewViewport } from "../lib/preview";

interface LayoutDraft {
  componentId: string;
  kind: "move" | "resize";
  placement: GridPlacement;
}

export function Canvas() {
  const [dropPreview, setDropPreview] = useState<GridPlacement>();
  const [layoutDraft, setLayoutDraft] = useState<LayoutDraft>();
  const project = useEditorStore((state) => state.project);
  const preview = useEditorStore((state) => state.preview);
  const previewOrientation = useEditorStore((state) => state.previewOrientation);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const dragComponentType = useEditorStore((state) => state.dragComponentType);
  const selectComponent = useEditorStore((state) => state.selectComponent);
  const addComponent = useEditorStore((state) => state.addComponent);
  const endPaletteDrag = useEditorStore((state) => state.endPaletteDrag);
  const moveComponent = useEditorStore((state) => state.moveComponent);
  const switchPage = useEditorStore((state) => state.switchPage);
  const createPage = useEditorStore((state) => state.createPage);
  const renamePage = useEditorStore((state) => state.renamePage);
  const duplicatePage = useEditorStore((state) => state.duplicatePage);
  const deletePage = useEditorStore((state) => state.deletePage);
  const stateValues = useEditorStore((state) => state.stateValues);
  const page = getActivePage(project);
  const viewport = getPreviewViewport(preview, previewOrientation);
  const columns = viewport.columns;
  const cell = viewport.cell;

  if (!page) {
    return <main className="canvas-shell">No page</main>;
  }

  const components = project.components.filter((component) => component.pageId === page.pageId);
  const contentBottom = Math.max(
    getGridBottom(components, preview),
    dropPreview ? dropPreview.y + dropPreview.h : 0,
    layoutDraft ? layoutDraft.placement.y + layoutDraft.placement.h : 0,
  );
  const height = Math.max(viewport.height, (contentBottom + 2) * cell);

  return (
    <main className={`canvas-shell preview-${preview} preview-${previewOrientation}`}>
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
        className={`dashboard-canvas ${dropPreview ? "is-drag-target" : ""}`}
        aria-label={viewport.label}
        style={{
          width: viewport.width,
          minHeight: height,
          backgroundSize: `${cell}px ${cell}px`,
          gridAutoRows: cell,
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
        onClick={() => useEditorStore.getState().clearSelection()}
        onDragOver={(event) => {
          const type = dragComponentType ?? readComponentDragType(event.dataTransfer);
          if (!type) {
            return;
          }

          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          const rect = event.currentTarget.getBoundingClientRect();
          setDropPreview(
            getCatalogDropPlacement(type, {
              clientX: event.clientX,
              clientY: event.clientY,
              rect,
              cell,
              columns,
            }),
          );
        }}
        onDragLeave={(event) => {
          const nextTarget = event.relatedTarget;
          if (!nextTarget || !event.currentTarget.contains(nextTarget as Node)) {
            setDropPreview(undefined);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          const type = readComponentDragType(event.dataTransfer) ?? dragComponentType;
          if (!type) {
            setDropPreview(undefined);
            endPaletteDrag();
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          const placement =
            dropPreview ??
            getCatalogDropPlacement(type, {
              clientX: event.clientX,
              clientY: event.clientY,
              rect,
              cell,
              columns,
            });
          addComponent(type, placement);
          setDropPreview(undefined);
          endPaletteDrag();
        }}
      >
        {dropPreview ? (
          <div
            className="drop-preview"
            style={{
              gridColumn: `${dropPreview.x + 1} / span ${dropPreview.w}`,
              gridRow: `${dropPreview.y + 1} / span ${dropPreview.h}`,
            }}
          />
        ) : null}
        {components.map((component) => {
          const storedPlacement = clampGridPlacement(
            resolveComponentPlacement(component, preview),
            columns,
          );
          const activeDraft =
            layoutDraft?.componentId === component.componentId ? layoutDraft : undefined;
          const placement = activeDraft?.placement ?? storedPlacement;
          const binding = getComponentBinding(project, component);
          const locked = isEditorLocked(component);
          const hidden = isEditorHidden(component);
          return (
            <ComponentTile
              bindingMissing={Boolean(binding?.missing)}
              bindings={project.bindings.filter(
                (item) => item.componentId === component.componentId,
              )}
              component={component}
              actions={project.actions.filter((item) => item.componentId === component.componentId)}
              isHidden={hidden}
              isLocked={locked}
              isMoving={activeDraft?.kind === "move"}
              isResizing={activeDraft?.kind === "resize"}
              isSelected={selectedIds.includes(component.componentId)}
              key={component.componentId}
              onSelect={(additive) => selectComponent(component.componentId, additive)}
              onStartMove={(event) => {
                if (locked) {
                  return;
                }
                selectComponent(
                  component.componentId,
                  event.shiftKey || event.ctrlKey || event.metaKey,
                );
                startLayoutInteraction(event, {
                  columns,
                  componentId: component.componentId,
                  kind: "move",
                  cell,
                  startPlacement: storedPlacement,
                  setLayoutDraft,
                  commitPlacement: (nextPlacement) =>
                    moveComponent(component.componentId, nextPlacement, preview),
                });
              }}
              onStartResize={(event, handle) => {
                if (locked) {
                  return;
                }
                selectComponent(
                  component.componentId,
                  event.shiftKey || event.ctrlKey || event.metaKey,
                );
                startLayoutInteraction(event, {
                  columns,
                  componentId: component.componentId,
                  kind: "resize",
                  resizeHandle: handle,
                  cell,
                  startPlacement: storedPlacement,
                  setLayoutDraft,
                  commitPlacement: (nextPlacement) =>
                    moveComponent(component.componentId, nextPlacement, preview),
                });
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
  isLocked: boolean;
  isHidden: boolean;
  isMoving: boolean;
  isResizing: boolean;
  bindingMissing: boolean;
  bindings: ReturnType<typeof useEditorStore.getState>["project"]["bindings"];
  actions: ReturnType<typeof useEditorStore.getState>["project"]["actions"];
  stateValues: ReturnType<typeof useEditorStore.getState>["stateValues"];
  onSelect(additive: boolean): void;
  onStartMove(event: React.PointerEvent<HTMLButtonElement>): void;
  onStartResize(event: React.PointerEvent<HTMLButtonElement>, handle: ResizeHandle): void;
}

function ComponentTile({
  component,
  placement,
  isSelected,
  isLocked,
  isHidden,
  isMoving,
  isResizing,
  bindingMissing,
  bindings,
  actions,
  stateValues,
  onSelect,
  onStartMove,
  onStartResize,
}: ComponentTileProps) {
  const setStateValues = useEditorStore((state) => state.setStateValues);
  return (
    <div
      className={`component-tile ${isSelected ? "is-selected" : ""} ${isLocked ? "is-locked" : ""} ${isHidden ? "is-editor-hidden" : ""} ${isMoving ? "is-moving" : ""} ${isResizing ? "is-resizing" : ""} ${bindingMissing ? "has-missing" : ""}`}
      style={{
        gridColumn: `${placement.x + 1} / span ${placement.w}`,
        gridRow: `${placement.y + 1} / span ${placement.h}`,
      }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }
        event.stopPropagation();
        onSelect(event.shiftKey || event.ctrlKey || event.metaKey);
      }}
    >
      <button
        aria-label="Move component"
        className="tile-grip"
        disabled={isLocked}
        title="Move component"
        type="button"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={onStartMove}
      >
        <Grip size={14} aria-hidden="true" />
      </button>
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
      {isLocked || isHidden ? (
        <div className="tile-state-badges" aria-hidden="true">
          {isLocked ? <Lock size={12} /> : null}
          {isHidden ? <EyeOff size={12} /> : null}
        </div>
      ) : null}
      {isSelected && !isLocked ? (
        <>
          <ResizeHandleButton handle="east" onStartResize={onStartResize} />
          <ResizeHandleButton handle="south" onStartResize={onStartResize} />
          <ResizeHandleButton handle="south-east" onStartResize={onStartResize} />
        </>
      ) : null}
    </div>
  );
}

function ResizeHandleButton({
  handle,
  onStartResize,
}: {
  handle: ResizeHandle;
  onStartResize(event: React.PointerEvent<HTMLButtonElement>, handle: ResizeHandle): void;
}) {
  const title =
    handle === "east"
      ? "Resize width"
      : handle === "south"
        ? "Resize height"
        : "Resize width and height";
  const Icon =
    handle === "east" ? MoveHorizontal : handle === "south" ? MoveVertical : MoveDiagonal2;

  return (
    <button
      aria-label={title}
      className={`resize-handle handle-${handle}`}
      title={title}
      type="button"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => onStartResize(event, handle)}
    >
      <Icon size={12} aria-hidden="true" />
    </button>
  );
}

interface LayoutInteractionOptions {
  componentId: string;
  kind: LayoutDraft["kind"];
  resizeHandle?: ResizeHandle | undefined;
  startPlacement: GridPlacement;
  cell: number;
  columns: number;
  setLayoutDraft(draft: LayoutDraft | undefined): void;
  commitPlacement(placement: GridPlacement): void;
}

function startLayoutInteraction(
  event: React.PointerEvent<HTMLButtonElement>,
  options: LayoutInteractionOptions,
): void {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const startX = event.clientX;
  const startY = event.clientY;
  const initialDraft: LayoutDraft = {
    componentId: options.componentId,
    kind: options.kind,
    placement: options.startPlacement,
  };

  options.setLayoutDraft(initialDraft);

  function nextPlacement(currentClientX: number, currentClientY: number): GridPlacement {
    const delta = getPointerGridDelta({
      startClientX: startX,
      startClientY: startY,
      currentClientX,
      currentClientY,
      cell: options.cell,
    });

    if (options.kind === "resize" && options.resizeHandle) {
      return resizeGridPlacement(
        options.startPlacement,
        options.resizeHandle,
        delta,
        options.columns,
      );
    }

    return moveGridPlacement(options.startPlacement, delta, options.columns);
  }

  function onMove(moveEvent: PointerEvent) {
    options.setLayoutDraft({
      ...initialDraft,
      placement: nextPlacement(moveEvent.clientX, moveEvent.clientY),
    });
  }

  function onUp(upEvent: PointerEvent) {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    const placement = nextPlacement(upEvent.clientX, upEvent.clientY);
    options.setLayoutDraft(undefined);
    if (!placementsEqual(options.startPlacement, placement)) {
      options.commitPlacement(placement);
    }
  }

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}
