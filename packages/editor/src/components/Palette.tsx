import {
  Camera,
  ChartLine,
  Gauge,
  House,
  Lightbulb,
  PanelTop,
  Sparkles,
  Thermometer,
  Zap,
} from "lucide-react";
import { componentCatalog, type ComponentCatalogEntry } from "@dashboard-ng/shared";
import { createComponentDragPayload, DASHBOARD_COMPONENT_MIME } from "../lib/dragDrop";
import { useEditorStore } from "../store/editorStore";

const icons = {
  Camera,
  ChartLine,
  Gauge,
  House,
  Lightbulb,
  PanelTop,
  Sparkles,
  Thermometer,
  Zap,
};

interface PaletteProps {
  onAdd(type: ComponentCatalogEntry["type"]): void;
}

export function Palette({ onAdd }: PaletteProps) {
  const startPaletteDrag = useEditorStore((state) => state.startPaletteDrag);
  const endPaletteDrag = useEditorStore((state) => state.endPaletteDrag);

  return (
    <aside className="palette" aria-label="Components">
      <div className="panel-title">Components</div>
      <div className="palette-list">
        {componentCatalog.map((entry) => {
          const Icon = icons[entry.icon as keyof typeof icons] ?? Sparkles;
          return (
            <button
              className={`palette-item ${entry.implemented ? "" : "is-planned"}`}
              draggable={entry.implemented}
              disabled={!entry.implemented}
              key={entry.type}
              title={entry.description}
              onClick={() => entry.implemented && onAdd(entry.type)}
              onDragStart={(event) => {
                if (!entry.implemented) {
                  event.preventDefault();
                  return;
                }

                const payload = createComponentDragPayload(entry.type);
                event.dataTransfer.setData(DASHBOARD_COMPONENT_MIME, payload);
                event.dataTransfer.setData("text/plain", payload);
                event.dataTransfer.effectAllowed = "copy";
                startPaletteDrag(entry.type);
              }}
              onDragEnd={endPaletteDrag}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{entry.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
