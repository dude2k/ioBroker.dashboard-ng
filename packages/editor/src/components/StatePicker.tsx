import { Search } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { StateOption } from "@dashboard-ng/shared";
import { dashboardClient } from "../lib/client";

interface StatePickerProps {
  label?: string;
  value?: string | undefined;
  onSelect(stateId: string): void;
}

export function StatePicker({ label = "State", value, onSelect }: StatePickerProps) {
  const inputId = useId();
  const [query, setQuery] = useState(value ?? "");
  const [states, setStates] = useState<StateOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    dashboardClient
      .searchObjects(query)
      .then((result) => {
        if (active) {
          setStates(result);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [query]);

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
          placeholder="Search states"
        />
      </div>
      <div className="state-list" aria-busy={loading}>
        {states.map((state) => (
          <button
            className={state.id === value ? "state-row is-selected" : "state-row"}
            key={state.id}
            onClick={() => {
              onSelect(state.id);
              setQuery(state.id);
            }}
            title={state.id}
          >
            <span className="state-name">{state.name}</span>
            <span className="state-meta">
              {state.write ? "rw" : "ro"} {state.unit ? ` ${state.unit}` : ""} {state.role ?? ""}
            </span>
            <span className="state-id">{state.id}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
