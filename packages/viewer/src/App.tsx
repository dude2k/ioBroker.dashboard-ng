import { Expand, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DashboardProject } from "@dashboard-ng/shared";
import { createDefaultDashboard } from "@dashboard-ng/shared";
import {
  DashboardRuntimeCard,
  resolveComponentPlacement,
  type RuntimeStateValues,
} from "@dashboard-ng/runtime";
import { viewerClient } from "./lib/client";

type WakeLockSentinel = {
  release(): Promise<void>;
};

export function ViewerApp() {
  const [project, setProject] = useState<DashboardProject>(() => createDefaultDashboard());
  const [stateValues, setStateValues] = useState<RuntimeStateValues>({});
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
        const nextValues: RuntimeStateValues = {};
        snapshots.forEach((snapshot) => {
          nextValues[snapshot.id] = snapshot;
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
          const placement = resolveComponentPlacement(component, "wall");
          const bindings = project.bindings.filter(
            (binding) => binding.componentId === component.componentId,
          );
          const actions = project.actions.filter(
            (action) => action.componentId === component.componentId,
          );
          return (
            <section
              className="viewer-tile"
              key={component.componentId}
              style={{
                gridColumn: `${placement.x + 1} / span ${placement.w}`,
                gridRow: `${placement.y + 1} / span ${placement.h}`,
              }}
            >
              <DashboardRuntimeCard
                actions={actions}
                bindings={bindings}
                component={component}
                mode="viewer"
                stateValues={stateValues}
                onLocalStateChange={(stateId, nextValue) => {
                  setStateValues((current) => ({ ...current, [stateId]: nextValue }));
                }}
                onNavigate={(pageId) => {
                  setProject((current) => ({
                    ...current,
                    settings: { ...current.settings, activePageId: pageId },
                  }));
                }}
                onWriteState={(stateId, value) => viewerClient.writeState(stateId, value)}
              />
            </section>
          );
        })}
      </main>
    </div>
  );
}
