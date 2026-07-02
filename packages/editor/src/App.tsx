import {
  ClipboardPaste,
  Copy,
  Download,
  Monitor,
  Moon,
  Redo2,
  RotateCw,
  Save,
  Smartphone,
  Sun,
  Tablet,
  Undo2,
  Upload,
} from "lucide-react";
import { useEffect, useRef } from "react";
import {
  validateDashboardProject,
  type DashboardProject,
  type StatePrimitive,
} from "@dashboard-ng/shared";
import { Canvas } from "./components/Canvas";
import { Inspector } from "./components/Inspector";
import { Palette } from "./components/Palette";
import { dashboardClient } from "./lib/client";
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
  const setStateValues = useEditorStore((state) => state.setStateValues);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeThemeId = project.settings.activeThemeId;

  useEffect(() => {
    dashboardClient
      .loadDashboard()
      .then((dashboard) => setProject(dashboard, "Loaded"))
      .catch((error) => setStatus(error instanceof Error ? error.message : String(error)));
  }, [setProject, setStatus]);

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

  async function saveDashboard() {
    try {
      const saved = await dashboardClient.saveDashboard(project);
      setProject(saved, "Saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
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
            <span>{dirty ? "Unsaved" : status}</span>
          </div>
        </div>

        <nav className="toolbar" aria-label="Editor actions">
          <button title="Save" onClick={() => void saveDashboard()}>
            <Save size={17} aria-hidden="true" />
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

      <div className="workspace">
        <Palette onAdd={addComponent} />
        <Canvas />
        <Inspector />
      </div>
    </div>
  );
}
