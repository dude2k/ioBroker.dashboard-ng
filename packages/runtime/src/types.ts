import type {
  Binding,
  DashboardAction,
  DashboardComponent,
  StatePrimitive,
  StateSnapshot,
} from "@dashboard-ng/shared";

export type RuntimeMode = "editor" | "viewer";

export interface RuntimeResolvedState {
  value: StatePrimitive | undefined;
  missing: boolean;
  loading: boolean;
  error?: string;
}

export type RuntimeStateInput = StatePrimitive | StateSnapshot | RuntimeResolvedState | undefined;
export type RuntimeStateValues = Record<string, RuntimeStateInput>;

export interface RuntimeTargetState extends RuntimeResolvedState {
  empty: boolean;
  readable: boolean;
  writable: boolean;
  stateId?: string;
  binding?: Binding;
}

export interface DashboardRuntimeCardProps {
  component: DashboardComponent;
  bindings?: Binding[];
  actions?: DashboardAction[];
  stateValues?: RuntimeStateValues;
  mode?: RuntimeMode;
  disabled?: boolean;
  onWriteState?(stateId: string, value: StatePrimitive): Promise<void> | void;
  onLocalStateChange?(stateId: string, value: StatePrimitive): void;
  onNavigate?(pageId: string): void;
  onOpenUrl?(url: string, newWindow: boolean): void;
}
