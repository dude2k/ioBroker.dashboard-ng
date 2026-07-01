import { useState, type MouseEvent, type ReactNode } from "react";
import { runDashboardAction, type StatePrimitive } from "@dashboard-ng/shared";
import { RuntimeContainer, RuntimeImage, RuntimeText, RuntimeValue } from "./base";
import { RuntimeIcon } from "./icons";
import {
  formatRuntimeValue,
  getBindingForTarget,
  readPrimitiveState,
  resolveTargetState,
} from "./state";
import type { DashboardRuntimeCardProps, RuntimeTargetState } from "./types";

type CardTone =
  | "neutral"
  | "light"
  | "sensor"
  | "scene"
  | "room"
  | "thermostat"
  | "blind"
  | "energy"
  | "chart"
  | "camera"
  | "error";

interface CardContext extends Required<Pick<DashboardRuntimeCardProps, "component">> {
  bindings: NonNullable<DashboardRuntimeCardProps["bindings"]>;
  actions: NonNullable<DashboardRuntimeCardProps["actions"]>;
  stateValues: NonNullable<DashboardRuntimeCardProps["stateValues"]>;
  mode: NonNullable<DashboardRuntimeCardProps["mode"]>;
  disabled: boolean;
  pending: boolean;
  error: string | undefined;
  runPrimaryAction(event?: MouseEvent): Promise<void>;
}

export function DashboardRuntimeCard(props: DashboardRuntimeCardProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const context: CardContext = {
    component: props.component,
    bindings: props.bindings ?? [],
    actions: props.actions ?? [],
    stateValues: props.stateValues ?? {},
    mode: props.mode ?? "viewer",
    disabled: Boolean(props.disabled),
    pending,
    error,
    runPrimaryAction: async (event) => {
      event?.stopPropagation();
      if (props.disabled || pending) {
        return;
      }
      setPending(true);
      setError(undefined);
      try {
        await runComponentAction(props);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : String(actionError));
      } finally {
        setPending(false);
      }
    },
  };

  try {
    return renderCard(context);
  } catch (renderError) {
    return (
      <CardShell context={context} tone="error" status="Error">
        <RuntimeIcon name="AlertTriangle" />
        <RuntimeText strong>{cardTitle(context)}</RuntimeText>
        <RuntimeText muted>
          {renderError instanceof Error ? renderError.message : "Render failed"}
        </RuntimeText>
      </CardShell>
    );
  }
}

function renderCard(context: CardContext) {
  switch (context.component.type) {
    case "light-card":
      return <LightCard context={context} />;
    case "sensor-card":
      return <SensorCard context={context} />;
    case "scene-button":
      return <SceneButton context={context} />;
    case "room-card":
      return <RoomCard context={context} />;
    case "thermostat-card":
      return <ThermostatCard context={context} />;
    case "blind-card":
      return <BlindCard context={context} />;
    case "energy-card":
      return <EnergyCard context={context} />;
    case "mini-chart-card":
      return <MiniChartCard context={context} />;
    case "camera-card":
      return <CameraCard context={context} />;
    case "text":
      return <TextCard context={context} />;
    case "container":
      return <ContainerCard context={context} />;
    case "button":
      return <ButtonCard context={context} />;
    case "value-display":
      return <ValueDisplayCard context={context} />;
    default:
      return (
        <CardShell context={context} tone="error" status="Unknown">
          <RuntimeIcon name="AlertTriangle" />
          <RuntimeText strong>{cardTitle(context)}</RuntimeText>
          <RuntimeText muted>{context.component.type}</RuntimeText>
        </CardShell>
      );
  }
}

function LightCard({ context }: { context: CardContext }) {
  const value = resolveTargetState(context.bindings, context.stateValues);
  const active = Boolean(value.value);
  return (
    <CardShell
      context={context}
      interactive={isInteractive(context, value)}
      status={statusLabel(value, context)}
      tone="light"
      active={active}
      onClick={context.runPrimaryAction}
    >
      <CardTop
        icon="Lightbulb"
        title={cardTitle(context)}
        subtitle={cardSubtitle(context, value)}
      />
      <RuntimeValue value={value.empty ? "Bind" : active ? "On" : "Off"} />
    </CardShell>
  );
}

function SensorCard({ context }: { context: CardContext }) {
  const value = resolveTargetState(context.bindings, context.stateValues);
  const unit = propString(context, "unit");
  const decimals = propNumber(context, "precision");
  return (
    <CardShell context={context} status={statusLabel(value, context)} tone="sensor">
      <CardTop
        icon="Thermometer"
        title={cardTitle(context)}
        subtitle={cardSubtitle(context, value)}
      />
      <RuntimeValue
        value={formatRuntimeValue(value.value, { decimals, fallback: valueFallback(value) })}
        unit={unit || undefined}
      />
    </CardShell>
  );
}

function SceneButton({ context }: { context: CardContext }) {
  const value = resolveTargetState(context.bindings, context.stateValues);
  return (
    <CardShell
      context={context}
      interactive={hasTapAction(context) || value.writable}
      status={statusLabel(value, context)}
      tone="scene"
      onClick={context.runPrimaryAction}
    >
      <CardTop icon="Sparkles" title={cardTitle(context)} subtitle={cardSubtitle(context, value)} />
      <RuntimeValue value={context.pending ? "Running" : "Run"} />
    </CardShell>
  );
}

function RoomCard({ context }: { context: CardContext }) {
  const value = resolveTargetState(context.bindings, context.stateValues);
  return (
    <CardShell context={context} status={statusLabel(value, context)} tone="room">
      <CardTop icon="House" title={cardTitle(context)} subtitle={cardSubtitle(context, value)} />
      <div className="dng-runtime-chip-row">
        <span>{formatRuntimeValue(value.value, { fallback: "Ready" })}</span>
        <span>{propString(context, "zone") || "Room"}</span>
      </div>
    </CardShell>
  );
}

function ThermostatCard({ context }: { context: CardContext }) {
  const value = resolveTargetState(context.bindings, context.stateValues);
  const unit = propString(context, "unit") || "C";
  const target = propString(context, "target") || "--";
  return (
    <CardShell context={context} status={statusLabel(value, context)} tone="thermostat">
      <CardTop icon="Gauge" title={cardTitle(context)} subtitle={cardSubtitle(context, value)} />
      <RuntimeValue
        value={formatRuntimeValue(value.value, { fallback: valueFallback(value) })}
        unit={unit}
      />
      <RuntimeText muted>Target {target}</RuntimeText>
    </CardShell>
  );
}

function BlindCard({ context }: { context: CardContext }) {
  const value = resolveTargetState(context.bindings, context.stateValues);
  const position = typeof value.value === "number" ? Math.max(0, Math.min(100, value.value)) : 0;
  return (
    <CardShell context={context} status={statusLabel(value, context)} tone="blind">
      <CardTop icon="PanelTop" title={cardTitle(context)} subtitle={cardSubtitle(context, value)} />
      <RuntimeValue
        value={
          value.empty || value.loading || value.missing ? valueFallback(value) : `${position}%`
        }
      />
      <div className="dng-runtime-progress" aria-hidden="true">
        <span style={{ width: `${position}%` }} />
      </div>
    </CardShell>
  );
}

function EnergyCard({ context }: { context: CardContext }) {
  const value = resolveTargetState(context.bindings, context.stateValues);
  const unit = propString(context, "unit") || "W";
  return (
    <CardShell context={context} status={statusLabel(value, context)} tone="energy">
      <CardTop icon="Zap" title={cardTitle(context)} subtitle={cardSubtitle(context, value)} />
      <RuntimeValue
        value={formatRuntimeValue(value.value, { fallback: valueFallback(value) })}
        unit={unit}
      />
      <RuntimeText muted>{propString(context, "period") || "Current"}</RuntimeText>
    </CardShell>
  );
}

function MiniChartCard({ context }: { context: CardContext }) {
  const value = resolveTargetState(context.bindings, context.stateValues);
  const samples = getChartSamples(context, value.value);
  return (
    <CardShell context={context} status={statusLabel(value, context)} tone="chart">
      <CardTop
        icon="ChartLine"
        title={cardTitle(context)}
        subtitle={cardSubtitle(context, value)}
      />
      <div className="dng-runtime-bars" aria-hidden="true">
        {samples.map((sample, index) => (
          <span key={`${sample}-${index}`} style={{ height: `${Math.max(10, sample)}%` }} />
        ))}
      </div>
    </CardShell>
  );
}

function CameraCard({ context }: { context: CardContext }) {
  const value = resolveTargetState(context.bindings, context.stateValues);
  const imageUrl = typeof value.value === "string" ? value.value : propString(context, "imageUrl");
  return (
    <CardShell context={context} status={statusLabel(value, context)} tone="camera">
      <CardTop icon="Camera" title={cardTitle(context)} subtitle={cardSubtitle(context, value)} />
      <RuntimeImage src={imageUrl || undefined} alt={cardTitle(context)} />
    </CardShell>
  );
}

function TextCard({ context }: { context: CardContext }) {
  return (
    <CardShell context={context} tone="neutral">
      <RuntimeText strong>{propString(context, "text") || cardTitle(context)}</RuntimeText>
    </CardShell>
  );
}

function ContainerCard({ context }: { context: CardContext }) {
  return (
    <CardShell context={context} tone="neutral">
      <CardTop icon="Box" title={cardTitle(context)} subtitle={propString(context, "subtitle")} />
    </CardShell>
  );
}

function ButtonCard({ context }: { context: CardContext }) {
  return (
    <CardShell
      context={context}
      interactive={hasTapAction(context)}
      tone="scene"
      onClick={context.runPrimaryAction}
    >
      <CardTop
        icon="MousePointerClick"
        title={cardTitle(context)}
        subtitle={propString(context, "subtitle")}
      />
    </CardShell>
  );
}

function ValueDisplayCard({ context }: { context: CardContext }) {
  const value = resolveTargetState(context.bindings, context.stateValues);
  return (
    <CardShell context={context} status={statusLabel(value, context)} tone="sensor">
      <CardTop icon="Activity" title={cardTitle(context)} subtitle={cardSubtitle(context, value)} />
      <RuntimeValue value={formatRuntimeValue(value.value, { fallback: valueFallback(value) })} />
    </CardShell>
  );
}

interface CardShellProps {
  context: CardContext;
  children: ReactNode;
  tone: CardTone;
  active?: boolean;
  interactive?: boolean;
  status?: string | undefined;
  onClick?(event: MouseEvent): void | Promise<void>;
}

function CardShell({
  context,
  children,
  tone,
  active = false,
  interactive = false,
  status,
  onClick,
}: CardShellProps) {
  const stateClass = [
    active ? "is-active" : "",
    context.pending ? "is-pending" : "",
    context.error ? "has-error" : "",
    statusClass(status),
  ]
    .filter(Boolean)
    .join(" ");
  const className = `dng-runtime-card tone-${tone} mode-${context.mode} ${stateClass}`.trim();
  const content = (
    <>
      {children}
      {status || context.error ? (
        <span className="dng-runtime-status">{context.error ?? status}</span>
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <button
        className={className}
        disabled={context.disabled}
        type="button"
        onClick={(event) => void onClick?.(event)}
      >
        {content}
      </button>
    );
  }

  return <RuntimeContainer className={className}>{content}</RuntimeContainer>;
}

function CardTop({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string | undefined;
}) {
  return (
    <div className="dng-runtime-top">
      <RuntimeIcon name={icon} />
      <div>
        <RuntimeText strong>{title}</RuntimeText>
        {subtitle ? <RuntimeText muted>{subtitle}</RuntimeText> : null}
      </div>
    </div>
  );
}

async function runComponentAction(props: DashboardRuntimeCardProps): Promise<void> {
  const actions = props.actions ?? [];
  const tapAction = actions.find((action) => action.trigger === "tap");
  if (tapAction) {
    await runDashboardAction(tapAction, {
      getState: async (stateId) => readPrimitiveState(props.stateValues?.[stateId]),
      setState: async (stateId, value) => {
        await props.onWriteState?.(stateId, value);
        props.onLocalStateChange?.(stateId, value);
      },
      navigate: (pageId) => props.onNavigate?.(pageId),
      openUrl: (url, newWindow) => {
        if (props.onOpenUrl) {
          props.onOpenUrl(url, newWindow);
          return;
        }
        if (typeof window !== "undefined") {
          window.open(url, newWindow ? "_blank" : "_self", "noopener,noreferrer");
        }
      },
    });
    return;
  }

  const binding = getBindingForTarget(props.bindings, "value");
  if (!binding?.stateId || (binding.mode !== "write" && binding.mode !== "readwrite")) {
    return;
  }

  const current = readPrimitiveState(props.stateValues?.[binding.stateId]);
  const next =
    props.component.type === "light-card" ? (current ? false : true) : propFallbackValue(props);
  await props.onWriteState?.(binding.stateId, next);
  props.onLocalStateChange?.(binding.stateId, next);
}

function isInteractive(context: CardContext, value: RuntimeTargetState): boolean {
  return hasTapAction(context) || value.writable;
}

function hasTapAction(context: CardContext): boolean {
  return context.actions.some((action) => action.trigger === "tap");
}

function statusLabel(value: RuntimeTargetState, context: CardContext): string | undefined {
  if (context.pending) {
    return "Loading";
  }
  if (context.error) {
    return "Error";
  }
  if (value.missing) {
    return "Missing state";
  }
  if (value.loading) {
    return "Loading";
  }
  if (value.empty) {
    return "No binding";
  }
  return undefined;
}

function statusClass(status: string | undefined): string {
  switch (status) {
    case "Missing state":
      return "is-missing";
    case "Loading":
      return "is-loading";
    case "No binding":
      return "is-empty";
    case "Error":
      return "has-error";
    default:
      return "";
  }
}

function valueFallback(value: RuntimeTargetState): string {
  if (value.missing) {
    return "Missing";
  }
  if (value.loading) {
    return "--";
  }
  if (value.empty) {
    return "--";
  }
  return "--";
}

function cardTitle(context: CardContext): string {
  return String(context.component.props.title ?? context.component.name);
}

function cardSubtitle(context: CardContext, value: RuntimeTargetState): string | undefined {
  const subtitle = propString(context, "subtitle");
  if (subtitle) {
    return subtitle;
  }
  return value.stateId;
}

function propString(context: CardContext, key: string): string {
  const value = context.component.props[key];
  return typeof value === "string" ? value : "";
}

function propNumber(context: CardContext, key: string): number | undefined {
  const value = context.component.props[key];
  return typeof value === "number" ? value : undefined;
}

function propFallbackValue(props: DashboardRuntimeCardProps): StatePrimitive {
  const value = props.component.props.value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return true;
}

function getChartSamples(context: CardContext, current: StatePrimitive | undefined): number[] {
  const samples = context.component.props.samples;
  if (Array.isArray(samples) && samples.every((sample) => typeof sample === "number")) {
    return normalizeSamples(samples as number[]);
  }
  if (typeof current === "number") {
    return normalizeSamples([current * 0.45, current * 0.7, current, current * 0.8, current * 1.1]);
  }
  return [28, 42, 36, 64, 58, 82, 70];
}

function normalizeSamples(samples: number[]): number[] {
  const max = Math.max(...samples.map((sample) => Math.abs(sample)), 1);
  return samples.slice(-12).map((sample) => Math.round((Math.abs(sample) / max) * 100));
}
