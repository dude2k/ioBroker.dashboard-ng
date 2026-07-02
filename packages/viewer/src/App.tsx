import { Expand, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DashboardProject } from "@dashboard-ng/shared";
import {
  clampGridPlacement,
  DashboardRuntimeCard,
  getGridBottom,
  resolveRuntimeBreakpoint,
  resolveComponentPlacement,
  runtimeCellSize,
  runtimeColumns,
  type RuntimeStateValues,
} from "@dashboard-ng/runtime";
import { viewerClient } from "./lib/client";

type WakeLockSentinel = {
  release(): Promise<void>;
};

export function ViewerApp() {
  const [project, setProject] = useState<DashboardProject | undefined>();
  const [stateValues, setStateValues] = useState<RuntimeStateValues>({});
  const [online, setOnline] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [burnInOffset, setBurnInOffset] = useState({ x: 0, y: 0 });
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | undefined>();
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1024 : window.innerWidth,
  );
  const page = project
    ? (project.pages.find((candidate) => candidate.pageId === project.settings.activePageId) ??
      project.pages[0])
    : undefined;
  const activeThemeId = project?.settings.activeThemeId;
  const activeTheme = project?.themes.find((theme) => theme.themeId === activeThemeId);
  const components =
    project && page
      ? project.components.filter((component) => component.pageId === page.pageId)
      : [];
  const breakpoint = resolveRuntimeBreakpoint(viewportWidth);
  const columns = runtimeColumns[breakpoint];
  const cell = runtimeCellSize[breakpoint];
  const gridBottom = getGridBottom(components, breakpoint);
  const gridHeight = Math.max(cell * 8, (gridBottom + 1) * cell);

  const stateIds = useMemo(
    () =>
      Array.from(
        new Set(
          (project?.bindings ?? [])
            .map((binding) => binding.stateId)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    [project?.bindings],
  );

  useEffect(() => {
    viewerClient
      .loadDashboard()
      .then((dashboard) => {
        setProject(dashboard);
        setOnline(true);
        setLoadError(undefined);
      })
      .catch((error) => {
        setOnline(false);
        setLoadError(error instanceof Error ? error.message : String(error));
      });
  }, []);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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
    if (!project?.settings.burnInProtection) {
      return;
    }
    const interval = window.setInterval(() => {
      const step = Math.floor(Date.now() / 60000) % 5;
      setBurnInOffset({ x: (step - 2) * 2, y: (((step + 1) % 5) - 2) * 2 });
    }, 30000);
    return () => window.clearInterval(interval);
  }, [project?.settings.burnInProtection]);

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
      setLoadError(undefined);
    } catch {
      setOnline(false);
      setLoadError("Dashboard could not be loaded");
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
          <strong>{project?.name ?? "Dashboard-NG"}</strong>
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
      {!project ? (
        <div className="viewer-empty">
          <strong>Dashboard not loaded</strong>
          <span>{loadError ?? "Waiting for adapter storage"}</span>
        </div>
      ) : null}

      {project ? (
        <main
          className={`viewer-grid viewer-grid-${breakpoint}`}
          style={{
            gridAutoRows: cell,
            gridTemplateColumns: `repeat(${columns}, ${cell}px)`,
            minHeight: gridHeight,
            width: columns * cell,
          }}
        >
          {components.map((component) => {
            const placement = clampGridPlacement(
              resolveComponentPlacement(component, breakpoint),
              columns,
            );
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
                    setProject((current) =>
                      current
                        ? {
                            ...current,
                            settings: { ...current.settings, activePageId: pageId },
                          }
                        : current,
                    );
                  }}
                  onWriteState={(stateId, value) => viewerClient.writeState(stateId, value)}
                />
              </section>
            );
          })}
        </main>
      ) : null}
    </div>
  );
}
