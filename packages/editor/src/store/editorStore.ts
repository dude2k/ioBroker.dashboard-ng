import { create, type StoreApi } from "zustand";
import {
  createComponentFromCatalog,
  createDefaultDashboard,
  getCatalogEntry,
  type Binding,
  type BindingMode,
  type ComponentType,
  type DashboardBreakpoint,
  type DashboardComponent,
  type DashboardProject,
  type GridPlacement,
  type StatePrimitive,
} from "@dashboard-ng/shared";

export type PreviewSize = DashboardBreakpoint;

interface ClipboardData {
  components: DashboardComponent[];
  bindings: Binding[];
}

interface EditorState {
  project: DashboardProject;
  selectedIds: string[];
  preview: PreviewSize;
  history: DashboardProject[];
  future: DashboardProject[];
  dirty: boolean;
  status: string;
  stateValues: Record<string, StatePrimitive>;
  setProject(project: DashboardProject, status?: string): void;
  setStatus(status: string): void;
  setPreview(preview: PreviewSize): void;
  setStateValues(values: Record<string, StatePrimitive>): void;
  selectComponent(id: string, additive?: boolean): void;
  clearSelection(): void;
  addComponent(type: ComponentType, placement?: GridPlacement): void;
  updateComponentProps(componentId: string, props: Record<string, unknown>): void;
  moveComponent(
    componentId: string,
    placement: GridPlacement,
    breakpoint?: DashboardBreakpoint,
  ): void;
  setPrimaryBinding(componentId: string, stateId: string, mode: BindingMode): void;
  deleteSelected(): void;
  copySelected(): void;
  pasteClipboard(): void;
  undo(): void;
  redo(): void;
}

let clipboard: ClipboardData | undefined;

export const useEditorStore = create<EditorState>((set, get) => ({
  project: createDefaultDashboard(),
  selectedIds: [],
  preview: "desktop",
  history: [],
  future: [],
  dirty: false,
  status: "Ready",
  stateValues: {},

  setProject(project, status = "Loaded") {
    set({
      project,
      selectedIds: [],
      history: [],
      future: [],
      dirty: false,
      status,
    });
  },

  setStatus(status) {
    set({ status });
  },

  setPreview(preview) {
    set({ preview });
  },

  setStateValues(values) {
    set({ stateValues: values });
  },

  selectComponent(id, additive = false) {
    set((state) => {
      if (additive) {
        const selectedIds = state.selectedIds.includes(id)
          ? state.selectedIds.filter((selectedId) => selectedId !== id)
          : [...state.selectedIds, id];
        return { selectedIds };
      }
      return { selectedIds: [id] };
    });
  },

  clearSelection() {
    set({ selectedIds: [] });
  },

  addComponent(type, placement) {
    const state = get();
    const page = getActivePage(state.project);
    if (!page) {
      return;
    }

    const entry = getCatalogEntry(type);
    const componentId = createId("cmp");
    const nextPlacement = placement ?? {
      x: 0,
      y: nextComponentY(state.project),
      w: entry.defaultSize.w,
      h: entry.defaultSize.h,
    };
    const component = createComponentFromCatalog(type, componentId, page.pageId, nextPlacement);
    const nextProject: DashboardProject = {
      ...cloneProject(state.project),
      updatedAt: new Date().toISOString(),
    };

    nextProject.components.push(component);
    const nextPage = nextProject.pages.find((candidate) => candidate.pageId === page.pageId);
    nextPage?.componentIds.push(component.componentId);
    commit(set, state, nextProject, [component.componentId], "Component added");
  },

  updateComponentProps(componentId, props) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const component = nextProject.components.find((item) => item.componentId === componentId);
    if (!component) {
      return;
    }
    component.props = { ...component.props, ...props };
    component.name = typeof props.title === "string" ? props.title : component.name;
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Component updated");
  },

  moveComponent(componentId, placement, breakpoint) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const component = nextProject.components.find((item) => item.componentId === componentId);
    if (!component) {
      return;
    }
    const targetBreakpoint = breakpoint ?? state.preview;
    component.layout[targetBreakpoint] = placement;
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Layout updated");
  },

  setPrimaryBinding(componentId, stateId, mode) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const component = nextProject.components.find((item) => item.componentId === componentId);
    if (!component) {
      return;
    }

    let binding = nextProject.bindings.find(
      (item) => item.componentId === componentId && item.target === "value",
    );
    if (!binding) {
      binding = {
        bindingId: createId("bind"),
        componentId,
        target: "value",
        kind: "state",
        mode,
        stateId,
        missing: false,
      };
      nextProject.bindings.push(binding);
      component.bindingIds.push(binding.bindingId);
    } else {
      binding.mode = mode;
      binding.stateId = stateId;
      binding.missing = false;
    }

    if (component.type === "light-card") {
      ensureToggleAction(nextProject, component, stateId);
    }
    if (component.type === "scene-button") {
      ensureSetStateAction(nextProject, component, stateId);
    }

    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Binding updated");
  },

  deleteSelected() {
    const state = get();
    if (!state.selectedIds.length) {
      return;
    }
    const selected = new Set(state.selectedIds);
    const nextProject = cloneProject(state.project);
    nextProject.components = nextProject.components.filter(
      (component) => !selected.has(component.componentId),
    );
    nextProject.bindings = nextProject.bindings.filter(
      (binding) => !selected.has(binding.componentId),
    );
    nextProject.actions = nextProject.actions.filter((action) => !selected.has(action.componentId));
    nextProject.pages = nextProject.pages.map((page) => ({
      ...page,
      componentIds: page.componentIds.filter((componentId) => !selected.has(componentId)),
    }));
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, [], "Selection deleted");
  },

  copySelected() {
    const state = get();
    const selected = new Set(state.selectedIds);
    clipboard = {
      components: cloneJson(
        state.project.components.filter((component) => selected.has(component.componentId)),
      ),
      bindings: cloneJson(
        state.project.bindings.filter((binding) => selected.has(binding.componentId)),
      ),
    };
    set({ status: clipboard.components.length ? "Copied" : "Nothing to copy" });
  },

  pasteClipboard() {
    const state = get();
    const page = getActivePage(state.project);
    if (!clipboard || !clipboard.components.length || !page) {
      return;
    }

    const nextProject = cloneProject(state.project);
    const idMap = new Map<string, string>();
    const pastedComponents = clipboard.components.map((component) => {
      const nextId = createId("cmp");
      idMap.set(component.componentId, nextId);
      const nextComponent = cloneJson(component);
      nextComponent.componentId = nextId;
      nextComponent.pageId = page.pageId;
      nextComponent.bindingIds = [];
      nextComponent.actionIds = [];
      Object.values(nextComponent.layout).forEach((placement) => {
        placement.x += 1;
        placement.y += 1;
      });
      return nextComponent;
    });

    const pastedBindings = clipboard.bindings.map((binding) => {
      const componentId = idMap.get(binding.componentId) ?? binding.componentId;
      const nextBinding = cloneJson(binding);
      nextBinding.bindingId = createId("bind");
      nextBinding.componentId = componentId;
      const component = pastedComponents.find((item) => item.componentId === componentId);
      component?.bindingIds.push(nextBinding.bindingId);
      return nextBinding;
    });

    nextProject.components.push(...pastedComponents);
    nextProject.bindings.push(...pastedBindings);
    const nextPage = nextProject.pages.find((candidate) => candidate.pageId === page.pageId);
    nextPage?.componentIds.push(...pastedComponents.map((component) => component.componentId));
    nextProject.updatedAt = new Date().toISOString();
    commit(
      set,
      state,
      nextProject,
      pastedComponents.map((component) => component.componentId),
      "Pasted",
    );
  },

  undo() {
    const state = get();
    const previous = state.history.at(-1);
    if (!previous) {
      return;
    }
    set({
      project: previous,
      history: state.history.slice(0, -1),
      future: [cloneProject(state.project), ...state.future].slice(0, 50),
      dirty: true,
      status: "Undo",
    });
  },

  redo() {
    const state = get();
    const next = state.future[0];
    if (!next) {
      return;
    }
    set({
      project: next,
      history: [...state.history, cloneProject(state.project)].slice(-50),
      future: state.future.slice(1),
      dirty: true,
      status: "Redo",
    });
  },
}));

export function getActivePage(project: DashboardProject) {
  return (
    project.pages.find((page) => page.pageId === project.settings.activePageId) ?? project.pages[0]
  );
}

export function getComponentBinding(project: DashboardProject, component: DashboardComponent) {
  return project.bindings.find(
    (binding) => binding.componentId === component.componentId && binding.target === "value",
  );
}

export function getPlacement(
  component: DashboardComponent,
  breakpoint: DashboardBreakpoint,
): GridPlacement {
  return (
    component.layout[breakpoint] ??
    component.layout.desktop ??
    component.layout.tablet ??
    component.layout.phone ?? { x: 0, y: 0, w: 2, h: 2 }
  );
}

function commit(
  set: StoreApi<EditorState>["setState"],
  state: EditorState,
  project: DashboardProject,
  selectedIds: string[],
  status: string,
): void {
  set({
    project,
    selectedIds,
    history: [...state.history, cloneProject(state.project)].slice(-50),
    future: [],
    dirty: true,
    status,
  });
}

function ensureToggleAction(
  project: DashboardProject,
  component: DashboardComponent,
  stateId: string,
): void {
  let action = project.actions.find(
    (item) => item.componentId === component.componentId && item.trigger === "tap",
  );
  if (!action) {
    action = {
      actionId: createId("act"),
      componentId: component.componentId,
      trigger: "tap",
      steps: [],
    };
    project.actions.push(action);
    component.actionIds.push(action.actionId);
  }
  action.steps = [{ kind: "toggleState", stateId }];
}

function ensureSetStateAction(
  project: DashboardProject,
  component: DashboardComponent,
  stateId: string,
): void {
  let action = project.actions.find(
    (item) => item.componentId === component.componentId && item.trigger === "tap",
  );
  if (!action) {
    action = {
      actionId: createId("act"),
      componentId: component.componentId,
      trigger: "tap",
      steps: [],
    };
    project.actions.push(action);
    component.actionIds.push(action.actionId);
  }
  action.steps = [{ kind: "setState", stateId, value: true }];
}

function nextComponentY(project: DashboardProject): number {
  return project.components.reduce((max, component) => {
    const placement = getPlacement(component, "desktop");
    return Math.max(max, placement.y + placement.h);
  }, 0);
}

function cloneProject(project: DashboardProject): DashboardProject {
  return cloneJson(project);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
