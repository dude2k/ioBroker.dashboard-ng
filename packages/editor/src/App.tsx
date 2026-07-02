import {
  Bug,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Download,
  Eye,
  EyeOff,
  Lock,
  Monitor,
  Moon,
  Redo2,
  RotateCw,
  Save,
  Smartphone,
  Sun,
  Tablet,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  validateDashboardProject,
  type DashboardProject,
  type StatePrimitive,
} from "@dashboard-ng/shared";
import {
  clearDiagnostics,
  diagnosticEventName,
  getDiagnostics,
  type DiagnosticEntry,
} from "@dashboard-ng/runtime";
import { Canvas } from "./components/Canvas";
import { Inspector } from "./components/Inspector";
import { Palette } from "./components/Palette";
import { isEditorHidden, isEditorLocked } from "./lib/componentEditorState";
import { dashboardClient } from "./lib/client";
import { getPreviewViewport } from "./lib/preview";
import { useEditorStore, type PreviewSize } from "./store/editorStore";

const previewOptions: Array<{ value: PreviewSize; label: string; icon: typeof Monitor }> = [
  { value: "phone", label: "Phone", icon: Smartphone },
  { value: "tablet", label: "Tablet", icon: Tablet },
  { value: "desktop", label: "Desktop", icon: Monitor },
  { value: "wall", label: "Wall", icon: Monitor },
];

export function App() {
  const project = useEditorStore((state) => state.project);
  const preview = useEditorStore((state) => state.preview);
  const previewOrientation = useEditorStore((state) => state.previewOrientation);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const dirty = useEditorStore((state) => state.dirty);
  const status = useEditorStore((state) => state.status);
  const setProject = useEditorStore((state) => state.setProject);
  const setStatus = useEditorStore((state) => state.setStatus);
  const setPreview = useEditorStore((state) => state.setPreview);
  const togglePreviewOrientation = useEditorStore((state) => state.togglePreviewOrientation);
  const addComponent = useEditorStore((state) => state.addComponent);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const copySelected = useEditorStore((state) => state.copySelected);
  const pasteClipboard = useEditorStore((state) => state.pasteClipboard);
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const toggleSelectedLock = useEditorStore((state) => state.toggleSelectedLock);
  const toggleSelectedHidden = useEditorStore((state) => state.toggleSelectedHidden);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const nudgeSelected = useEditorStore((state) => state.nudgeSelected);
  const setStateValues = useEditorStore((state) => state.setStateValues);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticEntry[]>(() => getDiagnostics());
  const activeThemeId = project.settings.activeThemeId;
  const selectedComponents = project.components.filter((component) =>
    selectedIds.includes(component.componentId),
  );
  const hasSelection = selectedComponents.length > 0;
  const selectionLocked = selectedComponents.some(isEditorLocked);
  const selectionHidden = selectedComponents.some(isEditorHidden);

  useEffect(() => {
    dashboardClient
      .loadDashboard()
      .then((dashboard) => setProject(dashboard, "Loaded"))
      .catch((error) => setStatus(`Load failed: ${readErrorMessage(error)}`));
  }, [setProject, setStatus]);

  useEffect(() => {
    const updateDiagnostics = () => setDiagnostics(getDiagnostics());
    window.addEventListener(diagnosticEventName(), updateDiagnostics);
    updateDiagnostics();
    return () => window.removeEventListener(diagnosticEventName(), updateDiagnostics);
  }, []);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      const stateIds = Array.from(
        new Set(
          project.bindings
            .map((binding) => binding.stateId)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      if (!stateIds.length) {
        return;
      }
      const snapshots = await dashboardClient.readStates(stateIds);
      if (!active) {
        return;
      }
      const values: Record<string, StatePrimitive> = {};
      snapshots.forEach((snapshot) => {
        values[snapshot.id] = snapshot.value;
      });
      setStateValues(values);
    };

    void tick();
    const interval = window.setInterval(() => void tick(), 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [project.bindings, setStateValues]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTextInputTarget(event.target)) {
        return;
      }

      const command = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const viewport = getPreviewViewport(preview, previewOrientation);

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
        return;
      }

      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        const step = event.shiftKey ? 5 : 1;
        const delta = arrowKeyDelta(event.key, step);
        nudgeSelected(delta, preview, viewport.columns);
        return;
      }

      if (!command) {
        return;
      }

      if (key === "c") {
        event.preventDefault();
        copySelected();
      } else if (key === "v") {
        event.preventDefault();
        pasteClipboard();
      } else if (key === "d") {
        event.preventDefault();
        duplicateSelected();
      } else if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === "y") {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    copySelected,
    deleteSelected,
    duplicateSelected,
    nudgeSelected,
    pasteClipboard,
    preview,
    previewOrientation,
    redo,
    undo,
  ]);

  async function saveDashboard() {
    try {
      setStatus("Saving...");
      const saved = await dashboardClient.saveDashboard(project);
      setProject(saved, "Saved");
    } catch (error) {
      setStatus(`Save failed: ${readErrorMessage(error)}`);
    }
  }

  function exportDashboard() {
    const validation = validateDashboardProject(project);
    if (!validation.valid) {
      setStatus("Export blocked by validation errors");
      return;
    }

    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.projectId || "dashboard-ng"}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Exported");
  }

  async function importDashboard(file: File | undefined) {
    if (!file) {
      return;
    }
    const text = await file.text();
    const imported = JSON.parse(text) as DashboardProject;
    setProject(imported, "Imported");
  }

  function copyDiagnostics() {
    const text = formatDiagnostics(diagnostics, status);
    if (!navigator.clipboard) {
      setStatus("Diagnostics copy failed: clipboard unavailable");
      return;
    }
    void navigator.clipboard
      .writeText(text)
      .then(() => setStatus("Diagnostics copied"))
      .catch((error: unknown) => setStatus(`Diagnostics copy failed: ${readErrorMessage(error)}`));
  }

  function resetDiagnostics() {
    clearDiagnostics();
    setDiagnostics([]);
  }

  function toggleTheme() {
    const nextProject: DashboardProject = {
      ...project,
      settings: {
        ...project.settings,
        activeThemeId: activeThemeId === "modern-dark" ? "clean-light" : "modern-dark",
      },
      updatedAt: new Date().toISOString(),
    };
    setProject(nextProject, "Theme changed");
  }

  return (
    <div className={`editor-app theme-${activeThemeId}`}>
      <header className="topbar">
        <div className="brand">
          <img src="./dashboard-ng.svg" alt="" />
          <div>
            <strong>Dashboard-NG</strong>
            <span title={formatEditorStatus(dirty, status)}>
              {formatEditorStatus(dirty, status)}
            </span>
          </div>
        </div>

        <nav className="toolbar" aria-label="Editor actions">
          <button title="Save" onClick={() => void saveDashboard()}>
            <Save size={17} aria-hidden="true" />
          </button>
          <button
            className={diagnosticsOpen ? "toolbar-icon-active" : ""}
            title="Diagnostics"
            onClick={() => setDiagnosticsOpen((open) => !open)}
          >
            <Bug size={17} aria-hidden="true" />
          </button>
          <button title="Import" onClick={() => fileInputRef.current?.click()}>
            <Upload size={17} aria-hidden="true" />
          </button>
          <button title="Export" onClick={exportDashboard}>
            <Download size={17} aria-hidden="true" />
          </button>
          <span className="toolbar-separator" />
          <button title="Undo" onClick={undo}>
            <Undo2 size={17} aria-hidden="true" />
          </button>
          <button title="Redo" onClick={redo}>
            <Redo2 size={17} aria-hidden="true" />
          </button>
          <button title="Copy" onClick={copySelected}>
            <Copy size={17} aria-hidden="true" />
          </button>
          <button title="Paste" onClick={pasteClipboard}>
            <ClipboardPaste size={17} aria-hidden="true" />
          </button>
          <button disabled={!hasSelection} title="Duplicate selected" onClick={duplicateSelected}>
            <CopyPlus size={17} aria-hidden="true" />
          </button>
          <button
            disabled={!hasSelection}
            title={selectionLocked ? "Unlock selected" : "Lock selected"}
            onClick={toggleSelectedLock}
          >
            <Lock
              className={selectionLocked ? "toolbar-icon-active" : ""}
              size={17}
              aria-hidden="true"
            />
          </button>
          <button
            disabled={!hasSelection}
            title={selectionHidden ? "Show selected" : "Hide selected"}
            onClick={toggleSelectedHidden}
          >
            {selectionHidden ? (
              <EyeOff className="toolbar-icon-active" size={17} aria-hidden="true" />
            ) : (
              <Eye size={17} aria-hidden="true" />
            )}
          </button>
          <span className="toolbar-separator" />
          <button title="Toggle theme" onClick={toggleTheme}>
            {activeThemeId === "modern-dark" ? (
              <Moon size={17} aria-hidden="true" />
            ) : (
              <Sun size={17} aria-hidden="true" />
            )}
          </button>
        </nav>

        <div className="preview-switch" aria-label="Preview size">
          {previewOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                className={preview === option.value ? "is-active" : ""}
                key={option.value}
                title={option.label}
                onClick={() => setPreview(option.value)}
              >
                <Icon size={16} aria-hidden="true" />
              </button>
            );
          })}
          <span className="toolbar-separator" />
          <button title={`Orientation: ${previewOrientation}`} onClick={togglePreviewOrientation}>
            <RotateCw size={16} aria-hidden="true" />
          </button>
        </div>
        <input
          accept="application/json"
          hidden
          ref={fileInputRef}
          type="file"
          onChange={(event) => void importDashboard(event.target.files?.[0])}
        />
      </header>

      {diagnosticsOpen ? (
        <DiagnosticsPanel
          entries={diagnostics}
          status={status}
          onClear={resetDiagnostics}
          onClose={() => setDiagnosticsOpen(false)}
          onCopy={copyDiagnostics}
        />
      ) : null}

      <div className="workspace">
        <Palette onAdd={addComponent} />
        <Canvas />
        <Inspector />
      </div>
    </div>
  );
}

interface DiagnosticsPanelProps {
  entries: DiagnosticEntry[];
  status: string;
  onClear(): void;
  onClose(): void;
  onCopy(): void;
}

function DiagnosticsPanel({ entries, status, onClear, onClose, onCopy }: DiagnosticsPanelProps) {
  const visibleEntries = entries.slice(-80).reverse();
  return (
    <section className="diagnostics-panel" aria-label="Diagnostics">
      <header className="diagnostics-header">
        <strong>Diagnostics</strong>
        <div className="diagnostics-actions">
          <button title="Copy diagnostics" onClick={onCopy}>
            <Copy size={15} aria-hidden="true" />
          </button>
          <button title="Clear diagnostics" onClick={onClear}>
            <Trash2 size={15} aria-hidden="true" />
          </button>
          <button title="Close diagnostics" onClick={onClose}>
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="diagnostics-status" title={status}>
        {status}
      </div>
      <ol className="diagnostics-list">
        {visibleEntries.length ? (
          visibleEntries.map((entry, index) => (
            <li
              className={`diagnostics-entry is-${entry.level}`}
              key={`${entry.timestamp}-${index}`}
            >
              <time>{formatDiagnosticTime(entry.timestamp)}</time>
              <span>{entry.message}</span>
            </li>
          ))
        ) : (
          <li className="diagnostics-empty">No diagnostics yet</li>
        )}
      </ol>
    </section>
  );
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function formatEditorStatus(dirty: boolean, status: string): string {
  if (!dirty || isImportantStatus(status)) {
    return status;
  }
  return "Unsaved";
}

function isImportantStatus(status: string): boolean {
  return /failed|cannot|timed out|validation|blocked|error/i.test(status);
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatDiagnostics(entries: DiagnosticEntry[], status: string): string {
  const lines = [
    `Dashboard-NG diagnostics`,
    `Status: ${status}`,
    `URL: ${window.location.href}`,
    `User agent: ${navigator.userAgent}`,
    "",
    ...entries.map((entry) => `${entry.timestamp} ${entry.level.toUpperCase()} ${entry.message}`),
  ];
  return lines.join("\n");
}

function formatDiagnosticTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function arrowKeyDelta(key: string, step: number): { x: number; y: number } {
  switch (key) {
    case "ArrowLeft":
      return { x: -step, y: 0 };
    case "ArrowRight":
      return { x: step, y: 0 };
    case "ArrowUp":
      return { x: 0, y: -step };
    case "ArrowDown":
      return { x: 0, y: step };
    default:
      return { x: 0, y: 0 };
  }
}
