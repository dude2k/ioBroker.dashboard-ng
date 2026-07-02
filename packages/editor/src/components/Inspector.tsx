import { CopyPlus, Eye, EyeOff, Lock, Trash2 } from "lucide-react";
import { isEditorHidden } from "../lib/componentEditorState";
import { getComponentBinding, useEditorStore } from "../store/editorStore";
import { StatePicker } from "./StatePicker";

export function Inspector() {
  const project = useEditorStore((state) => state.project);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const updateComponentProps = useEditorStore((state) => state.updateComponentProps);
  const setPrimaryBinding = useEditorStore((state) => state.setPrimaryBinding);
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const toggleSelectedLock = useEditorStore((state) => state.toggleSelectedLock);
  const toggleSelectedHidden = useEditorStore((state) => state.toggleSelectedHidden);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const component = project.components.find((item) => item.componentId === selectedIds[0]);
  const selectedComponents = project.components.filter((item) =>
    selectedIds.includes(item.componentId),
  );

  if (!component) {
    return (
      <aside className="inspector" aria-label="Inspector">
        <div className="panel-title">Inspector</div>
        <div className="empty-panel">Select a component</div>
      </aside>
    );
  }

  if (selectedComponents.length > 1) {
    const hasHidden = selectedComponents.some(isEditorHidden);
    return (
      <aside className="inspector" aria-label="Inspector">
        <div className="panel-title">Selection</div>
        <div className="inspector-stack">
          <div className="empty-panel">{selectedComponents.length} components selected</div>
          <div className="inspector-actions">
            <button title="Duplicate selected" onClick={duplicateSelected}>
              <CopyPlus size={16} aria-hidden="true" />
            </button>
            <button title="Lock selected" onClick={toggleSelectedLock}>
              <Lock size={16} aria-hidden="true" />
            </button>
            <button title="Hide selected" onClick={toggleSelectedHidden}>
              {hasHidden ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>
          </div>
          <button
            className="danger-button"
            title="Delete selected components"
            onClick={deleteSelected}
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>Delete</span>
          </button>
        </div>
      </aside>
    );
  }

  const binding = getComponentBinding(project, component);
  const bindingMode = component.type === "sensor-card" ? "read" : "readwrite";

  return (
    <aside className="inspector" aria-label="Inspector">
      <div className="panel-title">Inspector</div>
      <div className="inspector-stack">
        <label className="field">
          <span className="field-label">Title</span>
          <input
            value={String(component.props.title ?? component.name)}
            onChange={(event) =>
              updateComponentProps(component.componentId, { title: event.target.value })
            }
          />
        </label>

        {component.type === "sensor-card" ? (
          <label className="field">
            <span className="field-label">Unit</span>
            <input
              value={String(component.props.unit ?? "")}
              onChange={(event) =>
                updateComponentProps(component.componentId, { unit: event.target.value })
              }
            />
          </label>
        ) : null}

        {component.type === "light-card" ? (
          <label className="field">
            <span className="field-label">Subtitle</span>
            <input
              value={String(component.props.subtitle ?? "")}
              onChange={(event) =>
                updateComponentProps(component.componentId, { subtitle: event.target.value })
              }
            />
          </label>
        ) : null}

        <StatePicker
          value={binding?.stateId}
          onSelect={(stateId) => setPrimaryBinding(component.componentId, stateId, bindingMode)}
        />

        <button
          className="danger-button"
          onClick={deleteSelected}
          title="Delete selected component"
        >
          <Trash2 size={16} aria-hidden="true" />
          <span>Delete</span>
        </button>
      </div>
    </aside>
  );
}
