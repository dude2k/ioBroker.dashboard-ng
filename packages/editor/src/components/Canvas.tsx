import { Grip, Lightbulb, Sparkles, Thermometer } from "lucide-react";
import type {
  ComponentType,
  DashboardComponent,
  GridPlacement,
  StatePrimitive,
} from "@dashboard-ng/shared";
import {
  getActivePage,
  getComponentBinding,
  getPlacement,
  useEditorStore,
} from "../store/editorStore";
import { dashboardClient } from "../lib/client";

const previewColumns = {
  phone: 4,
  tablet: 8,
  desktop: 12,
  wall: 12,
};

const cellSize = {
  phone: 58,
  tablet: 64,
  desktop: 72,
  wall: 78,
};

export function Canvas() {
  const project = useEditorStore((state) => state.project);
  const preview = useEditorStore((state) => state.preview);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const selectComponent = useEditorStore((state) => state.selectComponent);
  const addComponent = useEditorStore((state) => state.addComponent);
  const moveComponent = useEditorStore((state) => state.moveComponent);
  const stateValues = useEditorStore((state) => state.stateValues);
  const page = getActivePage(project);
  const columns = previewColumns[preview];
  const cell = cellSize[preview];
  const height = Math.max(520, (maxGridBottom(project.components, preview) + 2) * cell);

  if (!page) {
    return <main className="canvas-shell">No page</main>;
  }

  const components = project.components.filter((component) => component.pageId === page.pageId);

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
          const placement = clampPlacement(getPlacement(component, preview), columns);
          const binding = getComponentBinding(project, component);
          const value = binding?.stateId ? stateValues[binding.stateId] : undefined;
          return (
            <ComponentTile
              bindingMissing={Boolean(binding?.missing)}
              component={component}
              isSelected={selectedIds.includes(component.componentId)}
              key={component.componentId}
              onPointerDown={(event) => {
                event.stopPropagation();
                selectComponent(component.componentId, event.shiftKey);
                startDrag(event, component, placement, cell, columns, moveComponent);
              }}
              placement={placement}
              stateValue={value}
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
  stateValue: StatePrimitive | undefined;
  onPointerDown(event: React.PointerEvent<HTMLDivElement>): void;
}

function ComponentTile({
  component,
  placement,
  isSelected,
  bindingMissing,
  stateValue,
  onPointerDown,
}: ComponentTileProps) {
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
      <RuntimeCard component={component} value={stateValue} />
    </div>
  );
}

function RuntimeCard({
  component,
  value,
}: {
  component: DashboardComponent;
  value: StatePrimitive | undefined;
}) {
  const binding = getComponentBinding(useEditorStore.getState().project, component);
  const setStateValues = useEditorStore((state) => state.setStateValues);
  const stateValues = useEditorStore((state) => state.stateValues);

  if (component.type === "light-card") {
    const active = Boolean(value);
    return (
      <button
        className={`runtime-card light-card ${active ? "is-on" : ""}`}
        onClick={async (event) => {
          event.stopPropagation();
          if (!binding?.stateId) {
            return;
          }
          const next = !active;
          await dashboardClient.writeState(binding.stateId, next);
          setStateValues({ ...stateValues, [binding.stateId]: next });
        }}
      >
        <Lightbulb size={22} aria-hidden="true" />
        <span className="card-title">{String(component.props.title ?? component.name)}</span>
        <span className="card-value">{active ? "On" : "Off"}</span>
      </button>
    );
  }

  if (component.type === "sensor-card") {
    const unit = String(component.props.unit ?? "");
    return (
      <div className="runtime-card sensor-card">
        <Thermometer size={22} aria-hidden="true" />
        <span className="card-title">{String(component.props.title ?? component.name)}</span>
        <span className="sensor-value">
          {formatValue(value)}
          {unit ? <small>{unit}</small> : null}
        </span>
      </div>
    );
  }

  if (component.type === "scene-button") {
    return (
      <button
        className="runtime-card scene-button"
        onClick={async (event) => {
          event.stopPropagation();
          if (binding?.stateId) {
            await dashboardClient.writeState(binding.stateId, true);
          }
        }}
      >
        <Sparkles size={22} aria-hidden="true" />
        <span className="card-title">{String(component.props.title ?? component.name)}</span>
      </button>
    );
  }

  return (
    <div className="runtime-card planned-card">
      <span className="card-title">{String(component.props.title ?? component.name)}</span>
      <span className="card-value">{component.type}</span>
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
      clampPlacement(
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

function clampPlacement(placement: GridPlacement, columns: number): GridPlacement {
  const width = Math.max(1, Math.min(placement.w, columns));
  return {
    x: Math.max(0, Math.min(placement.x, columns - width)),
    y: Math.max(0, placement.y),
    w: width,
    h: Math.max(1, placement.h),
  };
}

function maxGridBottom(
  components: DashboardComponent[],
  breakpoint: keyof typeof previewColumns,
): number {
  return components.reduce((max, component) => {
    const placement = getPlacement(component, breakpoint);
    return Math.max(max, placement.y + placement.h);
  }, 0);
}

function formatValue(value: StatePrimitive | undefined): string {
  if (value === undefined || value === null) {
    return "--";
  }
  if (typeof value === "number") {
    return value.toFixed(Math.abs(value) >= 100 ? 0 : 1);
  }
  return String(value);
}
