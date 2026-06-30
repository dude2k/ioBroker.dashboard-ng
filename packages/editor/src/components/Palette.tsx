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
                event.dataTransfer.setData("application/dashboard-ng-component", entry.type);
                event.dataTransfer.effectAllowed = "copy";
              }}
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
