import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { detectDeviceMapping, type ComponentType, type StateOption } from "@dashboard-ng/shared";
import { dashboardClient } from "../lib/client";
import { buildStateTree, filterStateOptions, type StateTreeNode } from "../lib/stateTree";

export type StatePickerAccess = "read" | "write" | "any";

interface StatePickerProps {
  label?: string;
  value?: string | undefined;
  access?: StatePickerAccess;
  componentType?: ComponentType;
  onSelect(stateId: string, option: StateOption, candidates: StateOption[]): void;
}

export function StatePicker({
  label = "State",
  value,
  access = "read",
  componentType,
  onSelect,
}: StatePickerProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [states, setStates] = useState<StateOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(undefined);
    try {
      setStates(await dashboardClient.searchObjects("", 2500, refresh));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      return;
    }
    const timer = window.setTimeout(() => {
      void dashboardClient.searchObjects(normalized, 300).then((result) => {
        setStates((current) => mergeStates(current, result));
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!value || !states.length || states.some((state) => state.id === value)) {
      return;
    }
    void dashboardClient.searchObjects(value, 20).then((result) => {
      setStates((current) =>
        mergeStates(
          current,
          result.filter((state) => state.id === value),
        ),
      );
    });
  }, [states, value]);

  const selected = states.find((state) => state.id === value) ?? missingOption(value);
  const filtered = useMemo(() => filterStateOptions(states, query), [query, states]);
  const tree = useMemo(() => buildStateTree(filtered), [filtered]);
  const mapping =
    selected && !selected.deleted
      ? detectDeviceMapping(selected, states, componentType)
      : undefined;

  const select = (option: StateOption) => {
    if (!isSelectable(option, access)) {
      return;
    }
    onSelect(option.id, option, states);
  };

  return (
    <div className="state-picker">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="search-field">
        <Search size={16} aria-hidden="true" />
        <input
          id={inputId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search ID, name, role, room..."
        />
        <button type="button" title="Refresh objects" onClick={() => void load(true)}>
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      </div>

      {selected ? (
        <SelectedState option={selected} {...(mapping ? { deviceKind: mapping.kind } : {})} />
      ) : null}

      <div className="state-list" aria-busy={loading}>
        {loading && !states.length ? <div className="state-empty">Loading states...</div> : null}
        {error ? <div className="state-empty has-error">{error}</div> : null}
        {!loading && !error && !filtered.length ? (
          <div className="state-empty">No matching states</div>
        ) : null}
        {query.trim()
          ? filtered
              .slice(0, 300)
              .map((state) => (
                <StateRow
                  key={state.id}
                  state={state}
                  selected={state.id === value}
                  selectable={isSelectable(state, access)}
                  onSelect={select}
                />
              ))
          : tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                value={value}
                access={access}
                depth={0}
                onSelect={select}
              />
            ))}
      </div>
    </div>
  );
}

function TreeNode({
  node,
  value,
  access,
  depth,
  onSelect,
}: {
  node: StateTreeNode;
  value: string | undefined;
  access: StatePickerAccess;
  depth: number;
  onSelect(option: StateOption): void;
}) {
  return (
    <details className="state-tree-node" open={depth === 0}>
      <summary>
        <span>{node.label}</span>
        <small>{node.count}</small>
      </summary>
      <div className="state-tree-children">
        {node.states.map((state) => (
          <StateRow
            key={state.id}
            state={state}
            selected={state.id === value}
            selectable={isSelectable(state, access)}
            onSelect={onSelect}
          />
        ))}
        {node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            value={value}
            access={access}
            depth={depth + 1}
            onSelect={onSelect}
          />
        ))}
      </div>
    </details>
  );
}

function StateRow({
  state,
  selected,
  selectable,
  onSelect,
}: {
  state: StateOption;
  selected: boolean;
  selectable: boolean;
  onSelect(option: StateOption): void;
}) {
  const leaf = state.id.slice(state.id.lastIndexOf(".") + 1);
  return (
    <button
      className={`${selected ? "state-row is-selected" : "state-row"}${state.missing ? " is-missing" : ""}`}
      disabled={!selectable}
      type="button"
      onClick={() => onSelect(state)}
      title={selectable ? state.id : `${state.id} is not available for this binding`}
    >
      <span className="state-name">{state.name || leaf}</span>
      <span className="state-meta">
        {state.read ? "R" : ""}
        {state.write ? "W" : ""} {state.alias ? "Alias" : ""} {state.role ?? state.type}{" "}
        {state.unit ?? ""}
      </span>
      <span className="state-id">{state.id}</span>
    </button>
  );
}

function SelectedState({ option, deviceKind }: { option: StateOption; deviceKind?: string }) {
  return (
    <div
      className={
        option.missing || option.deleted ? "state-selection is-missing" : "state-selection"
      }
    >
      <div className="state-selection-title">
        <strong>{option.name}</strong>
        {option.missing || option.deleted ? <AlertTriangle size={14} aria-hidden="true" /> : null}
      </div>
      <div className="state-badges">
        {option.deleted ? <span className="has-warning">deleted</span> : null}
        {option.missing && !option.deleted ? (
          <span className="has-warning">no current value</span>
        ) : null}
        <span>{option.read ? "read" : "no read"}</span>
        <span>{option.write ? "write" : "read only"}</span>
        {option.alias ? <span>alias</span> : null}
        {deviceKind ? <span>{deviceKind}</span> : null}
        {option.q ? <span className="has-warning">q:{option.q}</span> : null}
        {option.ack === false ? <span className="has-warning">unacknowledged</span> : null}
      </div>
      <small>
        {[option.role, option.type, option.unit, rangeLabel(option), option.room, option.function]
          .filter(Boolean)
          .join(" | ")}
      </small>
      {option.value !== undefined ? <small>Current: {String(option.value)}</small> : null}
      {option.aliasTarget ? <small>Target: {option.aliasTarget}</small> : null}
      {option.ts ? (
        <small title={new Date(option.ts).toISOString()}>Updated {ageLabel(option.ts)}</small>
      ) : null}
      {option.lc ? (
        <small title={new Date(option.lc).toISOString()}>Changed {ageLabel(option.lc)}</small>
      ) : null}
    </div>
  );
}

function isSelectable(option: StateOption, access: StatePickerAccess): boolean {
  if (option.deleted) {
    return false;
  }
  if (access === "write") {
    return option.write;
  }
  if (access === "read") {
    return option.read;
  }
  return true;
}

function missingOption(value: string | undefined): StateOption | undefined {
  if (!value) {
    return undefined;
  }
  return {
    id: value,
    name: "Missing or deleted state",
    parentId: value.slice(0, Math.max(0, value.lastIndexOf("."))),
    type: "unknown",
    read: false,
    write: false,
    missing: true,
    deleted: true,
  };
}

function rangeLabel(option: StateOption): string | undefined {
  if (option.min === undefined && option.max === undefined) {
    return undefined;
  }
  return `${option.min ?? "-"}..${option.max ?? "+"}`;
}

function ageLabel(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m ago`;
  }
  return `${Math.round(seconds / 3600)}h ago`;
}

function mergeStates(current: StateOption[], incoming: StateOption[]): StateOption[] {
  if (!incoming.length) {
    return current;
  }
  const merged = new Map(current.map((state) => [state.id, state]));
  incoming.forEach((state) => merged.set(state.id, state));
  return [...merged.values()].sort((left, right) => left.id.localeCompare(right.id));
}
