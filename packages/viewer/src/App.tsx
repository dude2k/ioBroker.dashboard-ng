import { Expand, Minimize, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ensureThemePresets,
  themeCssVariables,
  type DashboardProject,
  type StatePrimitive,
} from "@dashboard-ng/shared";
import {
  clampGridPlacement,
  collectPageStateIds,
  DashboardRuntimeCard,
  getGridBottom,
  isComponentVisible,
  mergeRuntimeStateValues,
  resolveRuntimeBreakpoint,
  resolveComponentPlacement,
  runtimeCellSize,
  runtimeColumns,
  subscribeIoBrokerStates,
  type RuntimeStateValues,
} from "@dashboard-ng/runtime";
import { viewerClient } from "./lib/client";
import { canRequestWakeLock, getBurnInOffset, isKioskEnabled } from "./lib/kiosk";

const emptyBindings = [] as DashboardProject["bindings"];
const emptyActions = [] as DashboardProject["actions"];

type WakeLockSentinel = {
  release(): Promise<void>;
  addEventListener?(type: "release", listener: () => void): void;
};

export function ViewerApp() {
  const [project, setProject] = useState<DashboardProject | undefined>();
  const [activePageId, setActivePageId] = useState<string | undefined>();
  const [stateValues, setStateValues] = useState<RuntimeStateValues>({});
  const [online, setOnline] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [burnInOffset, setBurnInOffset] = useState({ x: 0, y: 0 });
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [viewerMessage, setViewerMessage] = useState<string | undefined>();
  const wakeLockRef = useRef<WakeLockSentinel | undefined>(undefined);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1024 : window.innerWidth,
  );
  const page = project
    ? (project.pages.find((candidate) => candidate.pageId === activePageId) ??
      project.pages.find((candidate) => candidate.pageId === project.settings.activePageId) ??
      project.pages[0])
    : undefined;
  const activeThemeId = project?.settings.activeThemeId;
  const activeTheme = project?.themes.find((theme) => theme.themeId === activeThemeId);
  const kiosk = isKioskEnabled(project, page);
  const components = useMemo(
    () =>
      project && page
        ? project.components.filter((component) => component.pageId === page.pageId)
        : [],
    [page?.pageId, project],
  );
  const bindingsByComponentId = useMemo(
    () => groupByComponentId(project?.bindings ?? emptyBindings),
    [project?.bindings],
  );
  const actionsByComponentId = useMemo(
    () => groupByComponentId(project?.actions ?? emptyActions),
    [project?.actions],
  );
  const visibleComponents = project
    ? components.filter((component) =>
        isComponentVisible(
          component,
          project.bindings.filter((binding) => binding.componentId === component.componentId),
          stateValues,
        ),
      )
    : [];
  const breakpoint = resolveRuntimeBreakpoint(viewportWidth);
  const columns = runtimeColumns[breakpoint];
  const cell = runtimeCellSize[breakpoint];
  const gridBottom = getGridBottom(visibleComponents, breakpoint);
  const gridHeight = Math.max(cell * 8, (gridBottom + 1) * cell);

  const stateIds = useMemo(
    () => (project && page ? collectPageStateIds(project, page.pageId) : []),
    [page?.pageId, project],
  );
  const stateKey = stateIds.join("\n");
  const reconnectIntervalMs = project?.settings.reconnectIntervalMs ?? 2500;

  const handleLocalStateChange = useCallback((stateId: string, nextValue: StatePrimitive) => {
    setStateValues((current) => mergeRuntimeStateValues(current, { [stateId]: nextValue }));
  }, []);
  const handleNavigate = useCallback(
    (pageId: string) => {
      if (project?.pages.some((candidate) => candidate.pageId === pageId)) {
        setActivePageId(pageId);
      }
    },
    [project],
  );
  const handleWriteState = useCallback(
    (stateId: string, value: StatePrimitive) => viewerClient.writeState(stateId, value),
    [],
  );

  useEffect(() => {
    viewerClient
      .loadDashboard()
      .then((dashboard) => {
        setProject({ ...dashboard, themes: ensureThemePresets(dashboard.themes) });
        setActivePageId(dashboard.settings.activePageId || dashboard.pages[0]?.pageId);
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
    let subscription: Awaited<ReturnType<typeof subscribeIoBrokerStates>>;
    let pollInterval: number | undefined;
    const ids = stateKey ? stateKey.split("\n") : [];
    const applySnapshots = (snapshots: Awaited<ReturnType<typeof viewerClient.readStates>>) => {
      if (!active) {
        return;
      }
      setStateValues((current) => {
        const updates = Object.fromEntries(snapshots.map((snapshot) => [snapshot.id, snapshot]));
        return mergeRuntimeStateValues(current, updates);
      });
      setOnline(true);
    };
    const refreshStates = async (): Promise<boolean> => {
      if (!ids.length) {
        return true;
      }
      try {
        applySnapshots(await viewerClient.readStates(ids));
        return true;
      } catch {
        if (active) {
          setOnline(false);
        }
        return false;
      }
    };
    const startPolling = () => {
      if (pollInterval === undefined) {
        pollInterval = window.setInterval(() => void refreshStates(), reconnectIntervalMs);
      }
    };
    const stopPolling = () => {
      if (pollInterval !== undefined) {
        window.clearInterval(pollInterval);
        pollInterval = undefined;
      }
    };
    const start = async () => {
      if (!ids.length) {
        return;
      }
      subscription = await subscribeIoBrokerStates(ids, applySnapshots, {
        traceId: "viewer-live-states",
        onConnectionChange: (connected) => {
          if (!active) {
            return;
          }
          if (!connected) {
            setOnline(false);
            startPolling();
            return;
          }
          void refreshStates().then((fresh) => {
            if (fresh && active) {
              stopPolling();
            } else if (active) {
              startPolling();
            }
          });
        },
      });
      if (!active) {
        subscription?.close();
        return;
      }
      if (!subscription) {
        await refreshStates();
        if (active) {
          startPolling();
        }
      }
    };
    void start();
    return () => {
      active = false;
      subscription?.close();
      stopPolling();
    };
  }, [reconnectIntervalMs, stateKey]);

  useEffect(() => {
    if (!project?.settings.burnInProtection) {
      setBurnInOffset({ x: 0, y: 0 });
      return;
    }
    let tick = Math.floor(Date.now() / 60000);
    const move = () => {
      if (document.visibilityState === "visible") {
        setBurnInOffset(getBurnInOffset(tick));
        tick += 1;
      }
    };
    move();
    const interval = window.setInterval(move, 60000);
    document.addEventListener("visibilitychange", move);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", move);
    };
  }, [project?.settings.burnInProtection]);

  const releaseWakeLock = useCallback(async () => {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = undefined;
    setWakeLockActive(false);
    if (sentinel) {
      try {
        await sentinel.release();
      } catch {
        // A browser can release the sentinel independently while hidden.
      }
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    const navigatorWithWakeLock = navigator as Navigator & {
      wakeLock?: { request(type: "screen"): Promise<WakeLockSentinel> };
    };
    if (
      !canRequestWakeLock(
        Boolean(project?.settings.wakeLock),
        document.visibilityState === "visible",
        Boolean(navigatorWithWakeLock.wakeLock),
      ) ||
      wakeLockRef.current
    ) {
      return;
    }
    try {
      const sentinel = await navigatorWithWakeLock.wakeLock!.request("screen");
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
      sentinel.addEventListener?.("release", () => {
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = undefined;
          setWakeLockActive(false);
        }
      });
    } catch {
      setWakeLockActive(false);
    }
  }, [project?.settings.wakeLock]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
      } else {
        void releaseWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    void requestWakeLock();
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void releaseWakeLock();
    };
  }, [releaseWakeLock, requestWakeLock]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    onFullscreenChange();
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        await requestWakeLock();
      }
      setViewerMessage(undefined);
    } catch {
      setViewerMessage("Fullscreen is unavailable in this browser");
    }
  }

  async function reload() {
    try {
      const dashboard = await viewerClient.loadDashboard();
      const nextDashboard = { ...dashboard, themes: ensureThemePresets(dashboard.themes) };
      setProject(nextDashboard);
      setActivePageId((current) =>
        current && nextDashboard.pages.some((candidate) => candidate.pageId === current)
          ? current
          : nextDashboard.settings.activePageId || nextDashboard.pages[0]?.pageId,
      );
      setOnline(true);
      setLoadError(undefined);
    } catch {
      setOnline(false);
      setLoadError("Dashboard could not be loaded");
    }
  }

  return (
    <div
      className={`viewer-app theme-mode-${activeTheme?.mode ?? "dark"} ${kiosk ? "is-kiosk" : ""}`}
      style={activeTheme ? (themeCssVariables(activeTheme) as CSSProperties) : undefined}
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
          <button
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={() => void toggleFullscreen()}
          >
            {fullscreen ? (
              <Minimize size={18} aria-hidden="true" />
            ) : (
              <Expand size={18} aria-hidden="true" />
            )}
          </button>
        </nav>
      </header>

      {!online ? (
        <div className="connection-hint" role="status">
          Reconnecting - showing last known values
        </div>
      ) : null}
      {viewerMessage ? (
        <div className="viewer-message" role="status">
          {viewerMessage}
        </div>
      ) : null}
      {!project ? (
        <div className="viewer-empty">
          <strong>Dashboard not loaded</strong>
          <span>{loadError ?? "Waiting for adapter storage"}</span>
        </div>
      ) : null}

      {project && project.pages.length > 1 && !page?.settings.hideNavigation ? (
        <nav className="viewer-page-tabs" aria-label="Dashboard pages">
          <div className="viewer-page-tab-list" role="tablist">
            {project.pages
              .slice()
              .sort((left, right) => left.order - right.order)
              .map((candidate) => (
                <button
                  aria-selected={candidate.pageId === page?.pageId}
                  className={
                    candidate.pageId === page?.pageId
                      ? "viewer-page-tab is-active"
                      : "viewer-page-tab"
                  }
                  key={candidate.pageId}
                  role="tab"
                  title={candidate.name}
                  onClick={() => setActivePageId(candidate.pageId)}
                >
                  {candidate.name}
                </button>
              ))}
          </div>
        </nav>
      ) : null}

      {project ? (
        <main
          className={`viewer-grid viewer-grid-${breakpoint}`}
          style={{
            gridAutoRows: cell,
            gridTemplateColumns: `repeat(${columns}, ${cell}px)`,
            minHeight: gridHeight,
            width: columns * cell,
            transform: `translate(${burnInOffset.x}px, ${burnInOffset.y}px)`,
            opacity: project.settings.burnInProtection ? 0.99 : 1,
          }}
        >
          {visibleComponents.map((component) => {
            const placement = clampGridPlacement(
              resolveComponentPlacement(component, breakpoint),
              columns,
            );
            const bindings = bindingsByComponentId.get(component.componentId) ?? emptyBindings;
            const actions = actionsByComponentId.get(component.componentId) ?? emptyActions;
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
                  onLocalStateChange={handleLocalStateChange}
                  onNavigate={handleNavigate}
                  onWriteState={handleWriteState}
                />
              </section>
            );
          })}
        </main>
      ) : null}
      {wakeLockActive ? <span className="viewer-wake-lock" aria-label="Wake Lock active" /> : null}
    </div>
  );
}

function groupByComponentId<T extends { componentId: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const group = groups.get(item.componentId);
    if (group) {
      group.push(item);
    } else {
      groups.set(item.componentId, [item]);
    }
  });
  return groups;
}
