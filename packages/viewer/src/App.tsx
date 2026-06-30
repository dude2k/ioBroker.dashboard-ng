import { Expand, Lightbulb, RotateCcw, Sparkles, Thermometer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  Binding,
  DashboardComponent,
  DashboardProject,
  GridPlacement,
  StatePrimitive,
} from "@dashboard-ng/shared";
import { createDefaultDashboard } from "@dashboard-ng/shared";
import { viewerClient } from "./lib/client";

type WakeLockSentinel = {
  release(): Promise<void>;
};

export function ViewerApp() {
  const [project, setProject] = useState<DashboardProject>(() => createDefaultDashboard());
  const [stateValues, setStateValues] = useState<Record<string, StatePrimitive>>({});
  const [online, setOnline] = useState(true);
  const [burnInOffset, setBurnInOffset] = useState({ x: 0, y: 0 });
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | undefined>();
  const page =
    project.pages.find((candidate) => candidate.pageId === project.settings.activePageId) ??
    project.pages[0];
  const activeTheme = project.themes.find(
    (theme) => theme.themeId === project.settings.activeThemeId,
  );
  const components = page
    ? project.components.filter((component) => component.pageId === page.pageId)
    : [];

  const stateIds = useMemo(
    () =>
      Array.from(
        new Set(
          project.bindings
            .map((binding) => binding.stateId)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    [project.bindings],
  );

  useEffect(() => {
    viewerClient
      .loadDashboard()
      .then((dashboard) => {
        setProject(dashboard);
        setOnline(true);
      })
      .catch(() => setOnline(false));
  }, []);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      if (!stateIds.length) {
        return;
      }
      try {
        const snapshots = await viewerClient.readStates(stateIds);
        if (!active) {
          return;
        }
        const nextValues: Record<string, StatePrimitive> = {};
        snapshots.forEach((snapshot) => {
          nextValues[snapshot.id] = snapshot.value;
        });
        setStateValues(nextValues);
        setOnline(true);
      } catch {
        setOnline(false);
      }
    };
    void tick();
    const interval = window.setInterval(() => void tick(), 2500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [stateIds]);

  useEffect(() => {
    if (!project.settings.burnInProtection) {
      return;
    }
    const interval = window.setInterval(() => {
      const step = Math.floor(Date.now() / 60000) % 5;
      setBurnInOffset({ x: (step - 2) * 2, y: (((step + 1) % 5) - 2) * 2 });
    }, 30000);
    return () => window.clearInterval(interval);
  }, [project.settings.burnInProtection]);

  async function requestWakeLock() {
    const navigatorWithWakeLock = navigator as Navigator & {
      wakeLock?: { request(type: "screen"): Promise<WakeLockSentinel> };
    };
    if (!navigatorWithWakeLock.wakeLock) {
      return;
    }
    const sentinel = await navigatorWithWakeLock.wakeLock.request("screen");
    setWakeLock(sentinel);
  }

  async function enterFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      await requestWakeLock();
    }
  }

  async function reload() {
    try {
      setProject(await viewerClient.loadDashboard());
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }

  useEffect(
    () => () => {
      void wakeLock?.release();
    },
    [wakeLock],
  );

  return (
    <div
      className={`viewer-app theme-${activeTheme?.themeId ?? "modern-dark"}`}
      style={{
        transform: `translate(${burnInOffset.x}px, ${burnInOffset.y}px)`,
      }}
    >
      <header className="viewer-top">
        <div>
          <strong>{project.name}</strong>
          <span>{online ? (page?.name ?? "Dashboard") : "Reconnecting"}</span>
        </div>
        <nav>
          <button title="Reload" onClick={() => void reload()}>
            <RotateCcw size={18} aria-hidden="true" />
          </button>
          <button title="Fullscreen" onClick={() => void enterFullscreen()}>
            <Expand size={18} aria-hidden="true" />
          </button>
        </nav>
      </header>

      {!online ? <div className="connection-hint">Connection interrupted</div> : null}

      <main className="viewer-grid">
        {components.map((component) => {
          const placement = getPlacement(component);
          const binding = getBinding(project, component);
          const value = binding?.stateId ? stateValues[binding.stateId] : undefined;
          return (
            <section
              className="viewer-tile"
              key={component.componentId}
              style={{
                gridColumn: `${placement.x + 1} / span ${placement.w}`,
                gridRow: `${placement.y + 1} / span ${placement.h}`,
              }}
            >
              <RuntimeCard
                binding={binding}
                component={component}
                stateValues={stateValues}
                value={value}
                onStateChange={(stateId, nextValue) => {
                  setStateValues((current) => ({ ...current, [stateId]: nextValue }));
                }}
              />
            </section>
          );
        })}
      </main>
    </div>
  );
}

function RuntimeCard({
  component,
  binding,
  value,
  stateValues,
  onStateChange,
}: {
  component: DashboardComponent;
  binding: Binding | undefined;
  value: StatePrimitive | undefined;
  stateValues: Record<string, StatePrimitive>;
  onStateChange(stateId: string, value: StatePrimitive): void;
}) {
  if (component.type === "light-card") {
    const active = Boolean(value);
    return (
      <button
        className={`viewer-card light ${active ? "is-on" : ""}`}
        onClick={async () => {
          if (!binding?.stateId) {
            return;
          }
          const next = !active;
          await viewerClient.writeState(binding.stateId, next);
          onStateChange(binding.stateId, next);
        }}
      >
        <Lightbulb size={26} aria-hidden="true" />
        <span>{String(component.props.title ?? component.name)}</span>
        <strong>{active ? "On" : "Off"}</strong>
      </button>
    );
  }

  if (component.type === "scene-button") {
    return (
      <button
        className="viewer-card scene"
        onClick={async () => {
          if (!binding?.stateId) {
            return;
          }
          await viewerClient.writeState(binding.stateId, true);
          onStateChange(binding.stateId, true);
        }}
      >
        <Sparkles size={26} aria-hidden="true" />
        <span>{String(component.props.title ?? component.name)}</span>
        <strong>Run</strong>
      </button>
    );
  }

  if (component.type === "sensor-card") {
    const unit = String(component.props.unit ?? "");
    return (
      <div className="viewer-card sensor">
        <Thermometer size={26} aria-hidden="true" />
        <span>{String(component.props.title ?? component.name)}</span>
        <strong>
          {formatValue(value)}
          {unit ? <small>{unit}</small> : null}
        </strong>
      </div>
    );
  }

  return (
    <div className="viewer-card">
      <span>{String(component.props.title ?? component.name)}</span>
      <strong>{stateValues[binding?.stateId ?? ""] ?? component.type}</strong>
    </div>
  );
}

function getPlacement(component: DashboardComponent): GridPlacement {
  return (
    component.layout.wall ??
    component.layout.desktop ??
    component.layout.tablet ??
    component.layout.phone ?? { x: 0, y: 0, w: 3, h: 2 }
  );
}

function getBinding(project: DashboardProject, component: DashboardComponent): Binding | undefined {
  return project.bindings.find(
    (binding) => binding.componentId === component.componentId && binding.target === "value",
  );
}

function formatValue(value: StatePrimitive | undefined): string {
  if (value === undefined || value === null) {
    return "--";
  }
  if (typeof value === "number") {
    return value.toFixed(Math.abs(value) >= 100 ? 0 : 1);
  }
  return String(value);
}
