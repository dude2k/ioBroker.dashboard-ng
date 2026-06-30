import { Trash2 } from "lucide-react";
import { getComponentBinding, useEditorStore } from "../store/editorStore";
import { StatePicker } from "./StatePicker";

export function Inspector() {
  const project = useEditorStore((state) => state.project);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const updateComponentProps = useEditorStore((state) => state.updateComponentProps);
  const setPrimaryBinding = useEditorStore((state) => state.setPrimaryBinding);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const component = project.components.find((item) => item.componentId === selectedIds[0]);

  if (!component) {
    return (
      <aside className="inspector" aria-label="Inspector">
        <div className="panel-title">Inspector</div>
        <div className="empty-panel">Select a component</div>
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
