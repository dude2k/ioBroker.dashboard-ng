import { Play, Plus, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  evaluateFormula,
  validateFormula,
  type FormulaContext,
  type FormulaValidationResult,
  type StatePrimitive,
} from "@dashboard-ng/shared";
import { createFormulaPreviewContext, insertFormulaStateReference } from "../lib/formulas";
import { StatePicker } from "./StatePicker";

interface FormulaEditorProps {
  label?: string;
  value: string;
  placeholder?: string;
  optional?: boolean;
  stateValues: Record<string, StatePrimitive>;
  aliases?: FormulaContext;
  onChange(value: string): void;
}

export function FormulaEditor({
  label = "Formula",
  value,
  placeholder = 'state("alias.0.power") / 1000',
  optional = false,
  stateValues,
  aliases = {},
  onChange,
}: FormulaEditorProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ message: string; error: boolean }>();
  const validation: FormulaValidationResult =
    optional && !value.trim() ? { valid: true, stateIds: [] } : validateFormula(value);

  useEffect(() => setTestResult(undefined), [value]);

  const insertState = (stateId: string) => {
    const input = inputRef.current;
    const inserted = insertFormulaStateReference(
      value,
      stateId,
      input?.selectionStart,
      input?.selectionEnd,
    );
    onChange(inserted.expression);
    setPickerOpen(false);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(inserted.cursor, inserted.cursor);
    });
  };

  const testFormula = () => {
    if (!validation.valid) {
      setTestResult({ message: validation.error ?? "Formula is invalid.", error: true });
      return;
    }
    const context = createFormulaPreviewContext(stateValues, aliases);
    const unavailable = validation.stateIds.filter((stateId) => !(stateId in context));
    if (unavailable.length) {
      setTestResult({ message: `No current value for ${unavailable.join(", ")}`, error: true });
      return;
    }
    try {
      setTestResult({
        message: `Result: ${String(evaluateFormula(value, context))}`,
        error: false,
      });
    } catch (error) {
      setTestResult({
        message: error instanceof Error ? error.message : "Formula evaluation failed.",
        error: true,
      });
    }
  };

  const status = validation.valid
    ? (testResult?.message ??
      (!value.trim()
        ? "No transform formula"
        : validation.stateIds.length
          ? `${validation.stateIds.length} state reference${validation.stateIds.length === 1 ? "" : "s"}`
          : "Formula is valid"))
    : (validation.error ?? "Formula is invalid.");

  return (
    <div className="field formula-editor">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <textarea
        id={inputId}
        ref={inputRef}
        aria-invalid={!validation.valid}
        value={value}
        rows={3}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="formula-toolbar">
        <button type="button" onClick={() => setPickerOpen((open) => !open)}>
          {pickerOpen ? <X size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
          <span>{pickerOpen ? "Close states" : "Insert state"}</span>
        </button>
        <button type="button" disabled={!validation.valid || !value.trim()} onClick={testFormula}>
          <Play size={14} aria-hidden="true" />
          <span>Test</span>
        </button>
      </div>
      {pickerOpen ? (
        <StatePicker
          label="Choose state"
          access="read"
          onSelect={(stateId) => insertState(stateId)}
        />
      ) : null}
      <span
        className={
          validation.valid && !testResult?.error ? "formula-status" : "formula-status has-error"
        }
      >
        {status}
      </span>
    </div>
  );
}
