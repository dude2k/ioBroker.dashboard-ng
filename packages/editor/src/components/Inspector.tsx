import { CopyPlus, Eye, EyeOff, Lock, Plus, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import {
  detectDeviceMapping,
  evaluateFormula,
  type FormulaContext,
  type ActionCondition,
  type ActionStep,
  type ActionTrigger,
  type Binding,
  type BindingMode,
  type BindingTransform,
  type ComponentType,
  type Page,
  type StatePrimitive,
  type StateOption,
  type VisibilityRule,
} from "@dashboard-ng/shared";
import {
  getConditionalStyleRule,
  type ConditionalStyleOperator,
  type ConditionalStyleRule,
  type ConditionalStyleTone,
} from "@dashboard-ng/runtime";
import { isEditorHidden } from "../lib/componentEditorState";
import { getComponentBinding, useEditorStore, type VisibilityOperator } from "../store/editorStore";
import { getBindingTargets, type InspectorBindingTarget } from "./bindingFields";
import {
  formatInspectorValue,
  getInspectorFields,
  parseInspectorValue,
  type InspectorField,
} from "./inspectorFields";
import { StatePicker } from "./StatePicker";

export function Inspector() {
  const project = useEditorStore((state) => state.project);
  const stateValues = useEditorStore((state) => state.stateValues);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const updateComponentProps = useEditorStore((state) => state.updateComponentProps);
  const setComponentBinding = useEditorStore((state) => state.setComponentBinding);
  const setComponentFormulaBinding = useEditorStore((state) => state.setComponentFormulaBinding);
  const setComponentBindingTransform = useEditorStore(
    (state) => state.setComponentBindingTransform,
  );
  const applyComponentDeviceMapping = useEditorStore((state) => state.applyComponentDeviceMapping);
  const removeComponentBinding = useEditorStore((state) => state.removeComponentBinding);
  const addComponentAction = useEditorStore((state) => state.addComponentAction);
  const updateComponentActionTrigger = useEditorStore(
    (state) => state.updateComponentActionTrigger,
  );
  const updateComponentActionStep = useEditorStore((state) => state.updateComponentActionStep);
  const setComponentActionCondition = useEditorStore((state) => state.setComponentActionCondition);
  const addComponentActionStep = useEditorStore((state) => state.addComponentActionStep);
  const removeComponentActionStep = useEditorStore((state) => state.removeComponentActionStep);
  const removeComponentAction = useEditorStore((state) => state.removeComponentAction);
  const setAdvancedMode = useEditorStore((state) => state.setAdvancedMode);
  const setComponentVisibility = useEditorStore((state) => state.setComponentVisibility);
  const setComponentVisibilityCondition = useEditorStore(
    (state) => state.setComponentVisibilityCondition,
  );
  const setComponentConditionalStyle = useEditorStore(
    (state) => state.setComponentConditionalStyle,
  );
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

  const bindingTargets = getBindingTargets(component.type);
  const componentActions = project.actions.filter(
    (action) => action.componentId === component.componentId,
  );

  return (
    <aside className="inspector" aria-label="Inspector">
      <div className="panel-title">Inspector</div>
      <div className="inspector-stack">
        <div className="inspector-meta">
          <span>{component.type}</span>
          <code>{component.componentId}</code>
        </div>

        <label className="field checkbox-field advanced-mode-toggle">
          <input
            type="checkbox"
            checked={project.settings.advancedMode}
            onChange={(event) => setAdvancedMode(event.target.checked)}
          />
          <span className="field-label">Advanced mode</span>
        </label>

        {getInspectorFields(component.type).map((field) => (
          <InspectorFieldControl
            key={field.prop}
            field={field}
            value={
              field.prop === "title"
                ? (component.props.title ?? component.name)
                : component.props[field.prop]
            }
            onChange={(value) =>
              updateComponentProps(component.componentId, {
                [field.prop]: value,
              })
            }
          />
        ))}

        {bindingTargets.length ? (
          <div className="binding-section">
            <div className="section-title">Bindings</div>
            {bindingTargets.map((target) => {
              const binding = getComponentBinding(project, component, target.target);
              return (
                <BindingTargetControl
                  key={target.target}
                  target={target}
                  binding={binding}
                  componentType={component.type}
                  stateValues={stateValues}
                  onSelectState={(stateId, mode, option, candidates) => {
                    setComponentBinding(component.componentId, target.target, stateId, mode);
                    if (option && candidates) {
                      applyComponentDeviceMapping(
                        component.componentId,
                        detectDeviceMapping(option, candidates, component.type),
                      );
                    }
                  }}
                  onSetFormula={(stateId, formula) =>
                    setComponentFormulaBinding(
                      component.componentId,
                      target.target,
                      stateId,
                      formula,
                    )
                  }
                  onChangeMode={(mode) => {
                    if (binding?.stateId) {
                      setComponentBinding(
                        component.componentId,
                        target.target,
                        binding.stateId,
                        mode,
                      );
                    }
                  }}
                  advancedMode={project.settings.advancedMode}
                  onSetTransform={(transform) =>
                    setComponentBindingTransform(component.componentId, target.target, transform)
                  }
                  onRemove={() => removeComponentBinding(component.componentId, target.target)}
                />
              );
            })}
          </div>
        ) : null}

        {project.settings.advancedMode ? (
          <>
            <VisibilityControl
              binding={getComponentBinding(project, component, "visibility")}
              visibility={component.visibility}
              onSetAlways={() => setComponentVisibility(component.componentId, { kind: "always" })}
              onSetCondition={(stateId, operator, expected) =>
                setComponentVisibilityCondition(component.componentId, stateId, operator, expected)
              }
              onSetFormula={(formula) =>
                setComponentVisibility(component.componentId, { kind: "formula", formula })
              }
            />

            <ConditionalStyleControl
              binding={getComponentBinding(project, component, "style")}
              rule={getConditionalStyleRule(component)}
              onChange={(rule) => setComponentConditionalStyle(component.componentId, rule)}
            />
          </>
        ) : null}

        <div className="action-section">
          <div className="section-title">Actions</div>
          <div className="action-toolbar">
            <button type="button" onClick={() => addComponentAction(component.componentId, "tap")}>
              <Plus size={14} aria-hidden="true" />
              <span>Tap</span>
            </button>
            <button
              type="button"
              onClick={() => addComponentAction(component.componentId, "longPress")}
            >
              <Plus size={14} aria-hidden="true" />
              <span>Long</span>
            </button>
            {project.settings.advancedMode ? (
              <button
                type="button"
                onClick={() => addComponentAction(component.componentId, "swipe")}
              >
                <Plus size={14} aria-hidden="true" />
                <span>Swipe</span>
              </button>
            ) : null}
          </div>
          {componentActions.length ? (
            componentActions.map((action) => (
              <div className="action-card" key={action.actionId}>
                <div className="binding-header">
                  <div>
                    <strong>{triggerLabel(action.trigger)}</strong>
                    <span>
                      {action.steps.length} step{action.steps.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <button
                    type="button"
                    title="Remove action"
                    onClick={() => removeComponentAction(action.actionId)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>

                <label className="field">
                  <span className="field-label">Trigger</span>
                  <select
                    value={action.trigger}
                    onChange={(event) =>
                      updateComponentActionTrigger(
                        action.actionId,
                        event.target.value as ActionTrigger,
                      )
                    }
                  >
                    <option value="tap">Tap</option>
                    <option value="longPress">Long press</option>
                    {project.settings.advancedMode || action.trigger === "swipe" ? (
                      <option value="swipe">Swipe</option>
                    ) : null}
                  </select>
                </label>

                {project.settings.advancedMode ? (
                  <ActionConditionControl
                    condition={action.condition}
                    stateValues={stateValues}
                    onChange={(condition) =>
                      setComponentActionCondition(action.actionId, condition)
                    }
                  />
                ) : null}

                <div className="action-branch-label">{action.condition ? "Then" : "Steps"}</div>

                {action.steps.map((step, stepIndex) => (
                  <ActionStepControl
                    key={`${action.actionId}-${stepIndex}`}
                    pages={project.pages}
                    step={step}
                    stepIndex={stepIndex}
                    onChange={(nextStep) =>
                      updateComponentActionStep(action.actionId, stepIndex, nextStep)
                    }
                    onRemove={() => removeComponentActionStep(action.actionId, stepIndex)}
                  />
                ))}

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => addComponentActionStep(action.actionId)}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>Add step</span>
                </button>

                {project.settings.advancedMode && action.condition ? (
                  <div className="action-else-branch">
                    <div className="action-branch-label">Else</div>
                    {(action.elseSteps ?? []).map((step, stepIndex) => (
                      <ActionStepControl
                        key={`${action.actionId}-else-${stepIndex}`}
                        pages={project.pages}
                        step={step}
                        stepIndex={stepIndex}
                        onChange={(nextStep) =>
                          updateComponentActionStep(
                            action.actionId,
                            stepIndex,
                            nextStep,
                            "elseSteps",
                          )
                        }
                        onRemove={() =>
                          removeComponentActionStep(action.actionId, stepIndex, "elseSteps")
                        }
                      />
                    ))}
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => addComponentActionStep(action.actionId, "elseSteps")}
                    >
                      <Plus size={14} aria-hidden="true" />
                      <span>Add else step</span>
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="binding-hint">No actions configured</div>
          )}
        </div>

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

function BindingTargetControl({
  target,
  binding,
  componentType,
  stateValues,
  onSelectState,
  onSetFormula,
  onChangeMode,
  advancedMode,
  onSetTransform,
  onRemove,
}: {
  target: InspectorBindingTarget;
  binding: Binding | undefined;
  componentType: ComponentType;
  stateValues: Record<string, StatePrimitive>;
  onSelectState(
    stateId: string,
    mode: BindingMode,
    option?: StateOption,
    candidates?: StateOption[],
  ): void;
  onSetFormula(stateId: string | undefined, formula: string): void;
  onChangeMode(mode: BindingMode): void;
  advancedMode: boolean;
  onSetTransform(transform: BindingTransform | undefined): void;
  onRemove(): void;
}) {
  const source = binding?.kind === "formula" ? "formula" : "state";
  const selectedMode = binding?.mode ?? target.defaultMode;
  const modes = target.modes.includes(selectedMode)
    ? target.modes
    : [selectedMode, ...target.modes];
  const formula = binding?.formula ?? "value";
  const formulaValidation = validateInspectorFormula(formula, binding?.stateId, stateValues);
  const pickerAccess =
    source === "formula"
      ? "read"
      : !binding && target.modes.includes("read")
        ? "any"
        : selectedMode === "read"
          ? "read"
          : "write";

  return (
    <div className={binding?.missing ? "binding-card is-missing" : "binding-card"}>
      <div className="binding-header">
        <div>
          <strong>{target.label}</strong>
          <span>{target.description}</span>
        </div>
        <code>{target.target}</code>
      </div>

      <label className="field">
        <span className="field-label">Source</span>
        <select
          value={source}
          onChange={(event) => {
            if (event.target.value === "formula") {
              onSetFormula(binding?.stateId, formula);
              return;
            }
            if (binding?.stateId) {
              onSelectState(binding.stateId, target.defaultMode);
            }
          }}
        >
          <option value="state">State</option>
          <option value="formula">Formula</option>
        </select>
      </label>

      <label className="field">
        <span className="field-label">Mode</span>
        <select
          disabled={!binding?.stateId || source === "formula"}
          value={selectedMode}
          onChange={(event) => onChangeMode(event.target.value as BindingMode)}
        >
          {modes.map((mode) => (
            <option key={mode} value={mode}>
              {modeLabel(mode)}
            </option>
          ))}
        </select>
      </label>

      <StatePicker
        label={source === "formula" ? "Input state" : "State"}
        value={binding?.stateId}
        access={pickerAccess}
        {...(source === "state" ? { componentType } : {})}
        onSelect={(stateId, option, candidates) =>
          source === "formula"
            ? onSetFormula(stateId, formula)
            : onSelectState(
                stateId,
                bindingModeForOption(selectedMode, target.modes, option),
                option,
                candidates,
              )
        }
      />

      {source === "formula" ? (
        <label className="field">
          <span className="field-label">Formula</span>
          <input
            value={formula}
            onChange={(event) => onSetFormula(binding?.stateId, event.target.value)}
            placeholder="value / 1000"
          />
          <span className={formulaValidation.valid ? "formula-status" : "formula-status has-error"}>
            {formulaValidation.message}
          </span>
        </label>
      ) : null}

      {advancedMode && binding ? (
        <BindingTransformControl transform={binding.transform} onChange={onSetTransform} />
      ) : null}

      {binding ? (
        <div className="binding-footer">
          <span>{binding.missing ? "Missing state" : binding.stateId}</span>
          <button type="button" title="Remove binding" onClick={onRemove}>
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="binding-hint">No state selected</div>
      )}
    </div>
  );
}

function BindingTransformControl({
  transform,
  onChange,
}: {
  transform: BindingTransform | undefined;
  onChange(transform: BindingTransform | undefined): void;
}) {
  const format = transform?.format ?? "raw";
  const update = (patch: Partial<BindingTransform>, remove: Array<keyof BindingTransform> = []) => {
    const next = { ...transform, ...patch };
    remove.forEach((key) => delete next[key]);
    const normalized: BindingTransform = {};
    if (next.format && next.format !== "raw") {
      normalized.format = next.format;
    }
    if (next.decimals !== undefined) {
      normalized.decimals = Math.max(0, Math.min(6, next.decimals));
    }
    if (next.formula?.trim()) {
      normalized.formula = next.formula;
    }
    onChange(Object.keys(normalized).length ? normalized : undefined);
  };

  return (
    <div className="binding-transform">
      <div className="action-branch-label">Value transform</div>
      <label className="field">
        <span className="field-label">Format</span>
        <select
          value={format}
          onChange={(event) =>
            update({ format: event.target.value as NonNullable<BindingTransform["format"]> })
          }
        >
          <option value="raw">Raw</option>
          <option value="number">Number</option>
          <option value="percent">Percent</option>
          <option value="temperature">Temperature</option>
          <option value="power">Power</option>
          <option value="energy">Energy</option>
        </select>
      </label>
      <label className="field">
        <span className="field-label">Decimals</span>
        <input
          type="number"
          min="0"
          max="6"
          step="1"
          value={transform?.decimals ?? ""}
          onChange={(event) => {
            if (event.target.value === "") {
              update({}, ["decimals"]);
            } else {
              update({ decimals: Number(event.target.value) });
            }
          }}
          placeholder="Automatic"
        />
      </label>
      <label className="field">
        <span className="field-label">Transform formula</span>
        <input
          value={transform?.formula ?? ""}
          onChange={(event) =>
            event.target.value ? update({ formula: event.target.value }) : update({}, ["formula"])
          }
          placeholder="value / 1000"
        />
      </label>
    </div>
  );
}

type VisibilityMode = "always" | VisibilityOperator | "formula";

function VisibilityControl({
  binding,
  visibility,
  onSetAlways,
  onSetCondition,
  onSetFormula,
}: {
  binding: Binding | undefined;
  visibility: VisibilityRule | undefined;
  onSetAlways(): void;
  onSetCondition(stateId: string, operator: VisibilityOperator, expected: StatePrimitive): void;
  onSetFormula(formula: string): void;
}) {
  const mode = visibilityMode(visibility);
  const expected = visibility?.expected ?? true;
  const formula = visibility?.kind === "formula" ? (visibility.formula ?? "") : "";

  return (
    <div className="visibility-section">
      <div className="section-title">Visibility</div>
      <div className="binding-card">
        <label className="field">
          <span className="field-label">Mode</span>
          <select
            value={mode}
            onChange={(event) => {
              const nextMode = event.target.value as VisibilityMode;
              if (nextMode === "always") {
                onSetAlways();
                return;
              }
              if (nextMode === "formula") {
                onSetFormula(formula || "true");
                return;
              }
              if (binding?.stateId) {
                onSetCondition(binding.stateId, nextMode, expected);
              }
            }}
          >
            <option value="always">Always visible</option>
            <option value="equals">State equals</option>
            <option value="notEquals">State not equals</option>
            <option value="greaterThan">State greater than</option>
            <option value="lessThan">State less than</option>
            <option value="formula">Formula true</option>
          </select>
        </label>

        {mode === "formula" ? (
          <label className="field">
            <span className="field-label">Formula</span>
            <input
              value={formula}
              onChange={(event) => onSetFormula(event.target.value)}
              placeholder="value == true"
            />
          </label>
        ) : null}

        {mode !== "always" && mode !== "formula" ? (
          <>
            <StatePicker
              label="State"
              value={binding?.stateId}
              onSelect={(stateId) => onSetCondition(stateId, mode, expected)}
            />
            <label className="field">
              <span className="field-label">Expected</span>
              <input
                value={formatActionValue(expected)}
                onChange={(event) =>
                  binding?.stateId
                    ? onSetCondition(binding.stateId, mode, parseActionValue(event.target.value))
                    : undefined
                }
                placeholder="true, 1, text"
              />
            </label>
          </>
        ) : null}
      </div>
    </div>
  );
}

function visibilityMode(visibility: VisibilityRule | undefined): VisibilityMode {
  if (!visibility || visibility.kind === "always") {
    return "always";
  }
  if (visibility.kind === "binding") {
    return "equals";
  }
  switch (visibility.formula) {
    case "value != expected":
      return "notEquals";
    case "value > expected":
      return "greaterThan";
    case "value < expected":
      return "lessThan";
    default:
      return "formula";
  }
}

function ConditionalStyleControl({
  binding,
  rule,
  onChange,
}: {
  binding: Binding | undefined;
  rule: ConditionalStyleRule | undefined;
  onChange(rule: ConditionalStyleRule | undefined): void;
}) {
  const current: ConditionalStyleRule = rule ?? {
    enabled: false,
    tone: "accent",
    operator: "equals",
    expected: true,
  };
  const stateId = current.stateId ?? binding?.stateId;

  const update = (patch: Partial<ConditionalStyleRule>) =>
    onChange({ ...current, ...patch, enabled: patch.enabled ?? current.enabled });

  return (
    <div className="conditional-style-section">
      <div className="section-title">Conditional style</div>
      <div className="binding-card">
        <label className="field checkbox-field">
          <input
            type="checkbox"
            checked={current.enabled}
            onChange={(event) =>
              event.target.checked ? update({ enabled: true }) : onChange(undefined)
            }
          />
          <span className="field-label">Enable style rule</span>
        </label>

        {current.enabled ? (
          <>
            <label className="field">
              <span className="field-label">Tone</span>
              <select
                value={current.tone}
                onChange={(event) => update({ tone: event.target.value as ConditionalStyleTone })}
              >
                <option value="accent">Accent</option>
                <option value="warning">Warning</option>
                <option value="danger">Danger</option>
                <option value="muted">Muted</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">Condition</span>
              <select
                value={current.operator}
                onChange={(event) =>
                  update({ operator: event.target.value as ConditionalStyleOperator })
                }
              >
                <option value="equals">State equals</option>
                <option value="notEquals">State not equals</option>
                <option value="greaterThan">State greater than</option>
                <option value="lessThan">State less than</option>
                <option value="formula">Formula true</option>
              </select>
            </label>

            {current.operator === "formula" ? (
              <label className="field">
                <span className="field-label">Formula</span>
                <input
                  value={current.formula ?? ""}
                  onChange={(event) => update({ formula: event.target.value })}
                  placeholder="value == true"
                />
              </label>
            ) : (
              <>
                <StatePicker
                  label="State"
                  value={stateId}
                  onSelect={(nextStateId) => update({ stateId: nextStateId })}
                />
                <label className="field">
                  <span className="field-label">Expected</span>
                  <input
                    value={formatActionValue(current.expected)}
                    onChange={(event) => update({ expected: parseActionValue(event.target.value) })}
                    placeholder="true, 1, text"
                  />
                </label>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function modeLabel(mode: BindingMode): string {
  switch (mode) {
    case "read":
      return "Read";
    case "write":
      return "Write";
    case "readwrite":
      return "Read/write";
  }
}

function bindingModeForOption(
  selectedMode: BindingMode,
  supportedModes: BindingMode[],
  option: StateOption,
): BindingMode {
  if (selectedMode === "read" && !option.read && option.write && supportedModes.includes("write")) {
    return "write";
  }
  if (selectedMode !== "read" && !option.write && option.read && supportedModes.includes("read")) {
    return "read";
  }
  return selectedMode;
}

function validateInspectorFormula(
  formula: string,
  stateId: string | undefined,
  stateValues: Record<string, StatePrimitive>,
): { valid: boolean; message: string } {
  if (!formula.trim()) {
    return { valid: false, message: "Formula is required" };
  }
  try {
    const context: FormulaContext = {};
    if (stateId) {
      context.value = stateValues[stateId] ?? 1;
    }
    Object.entries(stateValues).forEach(([id, value]) => {
      context[id] = value;
    });
    const result = evaluateFormula(formula, context);
    return { valid: true, message: `OK -> ${String(result)}` };
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : "Formula is invalid",
    };
  }
}

type ActionConditionMode = "none" | ActionCondition["kind"];

function ActionConditionControl({
  condition,
  stateValues,
  onChange,
}: {
  condition: ActionCondition | undefined;
  stateValues: Record<string, StatePrimitive>;
  onChange(condition: ActionCondition | undefined): void;
}) {
  const mode: ActionConditionMode = condition?.kind ?? "none";
  const formula = condition?.formula ?? "true";
  const expected = condition?.value ?? true;
  const formulaValidation = validateInspectorFormula(formula, condition?.stateId, stateValues);

  return (
    <div className="action-condition">
      <div className="action-branch-label">Condition</div>
      <label className="field">
        <span className="field-label">Run when</span>
        <select
          value={mode}
          onChange={(event) => {
            const nextMode = event.target.value as ActionConditionMode;
            if (nextMode === "none") {
              onChange(undefined);
            } else if (nextMode === "formula") {
              onChange({
                kind: "formula",
                ...(condition?.stateId ? { stateId: condition.stateId } : {}),
                formula,
              });
            } else {
              onChange({ kind: nextMode, stateId: condition?.stateId ?? "", value: expected });
            }
          }}
        >
          <option value="none">Always</option>
          <option value="stateEquals">State equals</option>
          <option value="stateNotEquals">State not equals</option>
          <option value="stateGreaterThan">State greater than</option>
          <option value="stateLessThan">State less than</option>
          <option value="formula">Formula is true</option>
        </select>
      </label>

      {mode !== "none" ? (
        <StatePicker
          label={mode === "formula" ? "Input state (optional)" : "State"}
          value={condition?.stateId}
          onSelect={(stateId) =>
            mode === "formula"
              ? onChange({ kind: "formula", stateId, formula })
              : onChange({ kind: mode, stateId, value: expected })
          }
        />
      ) : null}

      {mode === "formula" ? (
        <label className="field">
          <span className="field-label">Formula</span>
          <input
            value={formula}
            onChange={(event) =>
              onChange({
                kind: "formula",
                ...(condition?.stateId ? { stateId: condition.stateId } : {}),
                formula: event.target.value,
              })
            }
            placeholder="value > 10"
          />
          <span className={formulaValidation.valid ? "formula-status" : "formula-status has-error"}>
            {formulaValidation.message}
          </span>
        </label>
      ) : null}

      {mode !== "none" && mode !== "formula" ? (
        <label className="field">
          <span className="field-label">Expected</span>
          <input
            value={formatActionValue(expected)}
            onChange={(event) =>
              onChange({
                kind: mode,
                stateId: condition?.stateId ?? "",
                value: parseActionValue(event.target.value),
              })
            }
            placeholder="true, 1, text"
          />
        </label>
      ) : null}
    </div>
  );
}

function ActionStepControl({
  pages,
  step,
  stepIndex,
  onChange,
  onRemove,
}: {
  pages: Page[];
  step: ActionStep;
  stepIndex: number;
  onChange(step: ActionStep): void;
  onRemove(): void;
}) {
  return (
    <div className="action-step">
      <div className="binding-header">
        <strong>Step {stepIndex + 1}</strong>
        <button type="button" title="Remove step" onClick={onRemove}>
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>

      <label className="field">
        <span className="field-label">Type</span>
        <select
          value={step.kind}
          onChange={(event) => onChange(createActionStep(event.target.value, pages, step))}
        >
          <option value="setState">Set state</option>
          <option value="toggleState">Toggle state</option>
          <option value="runScene">Run scene</option>
          <option value="navigate">Navigate page</option>
          <option value="openUrl">Open URL</option>
        </select>
      </label>

      {step.kind === "navigate" ? (
        <label className="field">
          <span className="field-label">Page</span>
          <select
            value={step.pageId}
            onChange={(event) => onChange({ ...step, pageId: event.target.value })}
          >
            {pages.map((page) => (
              <option key={page.pageId} value={page.pageId}>
                {page.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {step.kind === "openUrl" ? (
        <>
          <label className="field">
            <span className="field-label">URL</span>
            <input
              type="url"
              value={step.url}
              onChange={(event) => onChange({ ...step, url: event.target.value })}
              placeholder="https://..."
            />
          </label>
          <label className="field checkbox-field">
            <input
              type="checkbox"
              checked={step.newWindow}
              onChange={(event) => onChange({ ...step, newWindow: event.target.checked })}
            />
            <span className="field-label">New window</span>
          </label>
        </>
      ) : null}

      {hasActionState(step) ? (
        <StatePicker
          label="State"
          value={step.stateId}
          access="write"
          onSelect={(stateId) => onChange({ ...step, stateId } as ActionStep)}
        />
      ) : null}

      {step.kind === "setState" || step.kind === "runScene" ? (
        <label className="field">
          <span className="field-label">Value</span>
          <input
            value={formatActionValue(step.value)}
            onChange={(event) =>
              onChange({ ...step, value: parseActionValue(event.target.value) } as ActionStep)
            }
            placeholder="true, 1, text"
          />
        </label>
      ) : null}
    </div>
  );
}

function createActionStep(kind: string, pages: Page[], previous: ActionStep): ActionStep {
  const stateId = hasActionState(previous) ? previous.stateId : "";
  const value = hasActionValue(previous) && previous.value !== undefined ? previous.value : true;
  switch (kind) {
    case "setState":
      return { kind: "setState", stateId, value };
    case "toggleState":
      return { kind: "toggleState", stateId };
    case "runScene":
      return { kind: "runScene", stateId, value };
    case "navigate":
      return { kind: "navigate", pageId: pages[0]?.pageId ?? "" };
    case "openUrl":
      return { kind: "openUrl", url: "", newWindow: false };
    default:
      return previous;
  }
}

function hasActionState(step: ActionStep): step is Extract<ActionStep, { stateId: string }> {
  return "stateId" in step;
}

function hasActionValue(step: ActionStep): step is Extract<ActionStep, { value?: StatePrimitive }> {
  return "value" in step;
}

function formatActionValue(value: StatePrimitive | undefined): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "";
  }
  return String(value);
}

function parseActionValue(value: string): StatePrimitive {
  const trimmed = value.trim();
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (trimmed === "null") {
    return null;
  }
  if (trimmed !== "" && Number.isFinite(Number(trimmed))) {
    return Number(trimmed);
  }
  return value;
}

function triggerLabel(trigger: ActionTrigger): string {
  switch (trigger) {
    case "tap":
      return "Tap";
    case "longPress":
      return "Long press";
    case "swipe":
      return "Swipe";
  }
}

function InspectorFieldControl({
  field,
  value,
  onChange,
}: {
  field: InspectorField;
  value: unknown;
  onChange(value: unknown): void;
}) {
  if (field.kind === "boolean") {
    return (
      <label className="field checkbox-field">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="field-label">{field.label}</span>
      </label>
    );
  }

  const formattedValue = formatInspectorValue(value, field);
  const commonProps = {
    value: formattedValue,
    placeholder: field.placeholder,
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      onChange(parseInspectorValue(event.target.value, field)),
  };

  return (
    <label className="field">
      <span className="field-label">{field.label}</span>
      <input
        {...commonProps}
        type={field.kind === "number" ? "number" : field.kind === "url" ? "url" : "text"}
        min={field.min}
        max={field.max}
        step={field.step}
      />
    </label>
  );
}
