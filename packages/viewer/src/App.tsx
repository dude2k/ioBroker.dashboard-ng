import { Expand, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardProject, StatePrimitive } from "@dashboard-ng/shared";
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

const emptyBindings = [] as DashboardProject["bindings"];
const emptyActions = [] as DashboardProject["actions"];

type WakeLockSentinel = {
  release(): Promise<void>;
};

export function ViewerApp() {
  const [project, setProject] = useState<DashboardProject | undefined>();
  const [activePageId, setActivePageId] = useState<string | undefined>();
  const [stateValues, setStateValues] = useState<RuntimeStateValues>({});
  const [online, setOnline] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [burnInOffset, setBurnInOffset] = useState({ x: 0, y: 0 });
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | undefined>();
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
        setProject(dashboard);
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
      const dashboard = await viewerClient.loadDashboard();
      setProject(dashboard);
      setActivePageId((current) =>
        current && dashboard.pages.some((candidate) => candidate.pageId === current)
          ? current
          : dashboard.settings.activePageId || dashboard.pages[0]?.pageId,
      );
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

      {!online ? (
        <div className="connection-hint" role="status">
          Reconnecting - showing last known values
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
