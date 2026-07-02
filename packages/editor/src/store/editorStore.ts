import { create, type StoreApi } from "zustand";
import {
  createComponentFromCatalog,
  createDefaultDashboard,
  getCatalogEntry,
  type Binding,
  type BindingMode,
  type DashboardAction,
  type ComponentType,
  type DashboardBreakpoint,
  type DashboardComponent,
  type DashboardProject,
  type GridPlacement,
  type Page,
  type StatePrimitive,
} from "@dashboard-ng/shared";
import { clampGridPlacement } from "@dashboard-ng/runtime";
import {
  clearEditorInteractionFlags,
  isEditorHidden,
  isEditorLocked,
  setEditorHidden,
  setEditorLocked,
} from "../lib/componentEditorState";
import {
  togglePreviewOrientation,
  type PreviewDevice,
  type PreviewOrientation,
} from "../lib/preview";

export type PreviewSize = PreviewDevice;

interface ClipboardData {
  components: DashboardComponent[];
  bindings: Binding[];
  actions: DashboardAction[];
}

interface GridDelta {
  x: number;
  y: number;
}

interface EditorState {
  project: DashboardProject;
  selectedIds: string[];
  preview: PreviewSize;
  previewOrientation: PreviewOrientation;
  history: DashboardProject[];
  future: DashboardProject[];
  dirty: boolean;
  status: string;
  stateValues: Record<string, StatePrimitive>;
  dragComponentType: ComponentType | undefined;
  setProject(project: DashboardProject, status?: string): void;
  setStatus(status: string): void;
  setPreview(preview: PreviewSize): void;
  setPreviewOrientation(orientation: PreviewOrientation): void;
  togglePreviewOrientation(): void;
  setStateValues(values: Record<string, StatePrimitive>): void;
  startPaletteDrag(type: ComponentType): void;
  endPaletteDrag(): void;
  switchPage(pageId: string): void;
  createPage(name?: string): void;
  renamePage(pageId: string, name: string): void;
  duplicatePage(pageId: string): void;
  deletePage(pageId: string): void;
  selectComponent(id: string, additive?: boolean): void;
  clearSelection(): void;
  addComponent(type: ComponentType, placement?: GridPlacement): void;
  duplicateSelected(): void;
  toggleSelectedLock(): void;
  toggleSelectedHidden(): void;
  nudgeSelected(delta: GridDelta, breakpoint?: DashboardBreakpoint, columns?: number): void;
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
  previewOrientation: "landscape",
  history: [],
  future: [],
  dirty: false,
  status: "Ready",
  stateValues: {},
  dragComponentType: undefined,

  setProject(project, status = "Loaded") {
    set({
      project,
      selectedIds: [],
      history: [],
      future: [],
      dirty: false,
      status,
      dragComponentType: undefined,
    });
  },

  setStatus(status) {
    set({ status });
  },

  setPreview(preview) {
    set({ preview });
  },

  setPreviewOrientation(orientation) {
    set({ previewOrientation: orientation });
  },

  togglePreviewOrientation() {
    set((state) => ({ previewOrientation: togglePreviewOrientation(state.previewOrientation) }));
  },

  setStateValues(values) {
    set({ stateValues: values });
  },

  startPaletteDrag(type) {
    set({ dragComponentType: type });
  },

  endPaletteDrag() {
    set({ dragComponentType: undefined });
  },

  switchPage(pageId) {
    const state = get();
    if (
      pageId === state.project.settings.activePageId ||
      !state.project.pages.some((page) => page.pageId === pageId)
    ) {
      return;
    }

    set({
      project: {
        ...state.project,
        settings: { ...state.project.settings, activePageId: pageId },
      },
      selectedIds: [],
      status: "Page selected",
    });
  },

  createPage(name) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const pageId = createId("page");
    const nextPage: Page = {
      pageId,
      name: uniquePageName(nextProject, name?.trim() || `Page ${nextProject.pages.length + 1}`),
      order: nextPageOrder(nextProject),
      componentIds: [],
      settings: {},
    };

    nextProject.pages = normalizePageOrders([...nextProject.pages, nextPage]);
    nextProject.settings.activePageId = pageId;
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, [], "Page created");
  },

  renamePage(pageId, name) {
    const state = get();
    const cleanName = name.trim();
    if (!cleanName) {
      set({ status: "Page name required" });
      return;
    }

    const nextProject = cloneProject(state.project);
    const page = nextProject.pages.find((candidate) => candidate.pageId === pageId);
    if (!page || page.name === cleanName) {
      return;
    }

    page.name = uniquePageName(nextProject, cleanName, pageId);
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Page renamed");
  },

  duplicatePage(pageId) {
    const state = get();
    const sourcePage = state.project.pages.find((page) => page.pageId === pageId);
    if (!sourcePage) {
      return;
    }

    const nextProject = cloneProject(state.project);
    const nextPageId = createId("page");
    const sourceComponents = nextProject.components.filter(
      (component) => component.pageId === sourcePage.pageId,
    );
    const componentIdMap = new Map<string, string>();
    const bindingIdMap = new Map<string, string>();
    const actionIdMap = new Map<string, string>();

    const copiedComponents = sourceComponents.map((component) => {
      const nextComponent = cloneJson(component);
      const nextComponentId = createId("cmp");
      componentIdMap.set(component.componentId, nextComponentId);
      nextComponent.componentId = nextComponentId;
      nextComponent.pageId = nextPageId;
      nextComponent.name = `${component.name} Copy`;
      nextComponent.bindingIds = [];
      nextComponent.actionIds = [];
      return nextComponent;
    });

    const copiedBindings = nextProject.bindings
      .filter((binding) => componentIdMap.has(binding.componentId))
      .map((binding) => {
        const nextBinding = cloneJson(binding);
        const nextBindingId = createId("bind");
        const nextComponentId = componentIdMap.get(binding.componentId) ?? binding.componentId;
        bindingIdMap.set(binding.bindingId, nextBindingId);
        nextBinding.bindingId = nextBindingId;
        nextBinding.componentId = nextComponentId;
        return nextBinding;
      });

    const copiedActions = nextProject.actions
      .filter((action) => componentIdMap.has(action.componentId))
      .map((action) => {
        const nextAction = cloneJson(action);
        const nextActionId = createId("act");
        const nextComponentId = componentIdMap.get(action.componentId) ?? action.componentId;
        actionIdMap.set(action.actionId, nextActionId);
        nextAction.actionId = nextActionId;
        nextAction.componentId = nextComponentId;
        nextAction.steps = remapPageActionSteps(nextAction.steps, sourcePage.pageId, nextPageId);
        if (nextAction.elseSteps) {
          nextAction.elseSteps = remapPageActionSteps(
            nextAction.elseSteps,
            sourcePage.pageId,
            nextPageId,
          );
        }
        return nextAction;
      });

    copiedComponents.forEach((component) => {
      const sourceComponent = sourceComponents.find((item) => {
        const copiedId = componentIdMap.get(item.componentId);
        return copiedId === component.componentId;
      });
      component.bindingIds =
        sourceComponent?.bindingIds
          .map((bindingId) => bindingIdMap.get(bindingId))
          .filter((bindingId): bindingId is string => Boolean(bindingId)) ?? [];
      component.actionIds =
        sourceComponent?.actionIds
          .map((actionId) => actionIdMap.get(actionId))
          .filter((actionId): actionId is string => Boolean(actionId)) ?? [];
    });

    const copiedPage: Page = {
      ...cloneJson(sourcePage),
      pageId: nextPageId,
      name: uniquePageName(nextProject, `${sourcePage.name} Copy`),
      order: nextPageOrder(nextProject),
      componentIds: copiedComponents.map((component) => component.componentId),
    };

    nextProject.pages = normalizePageOrders([...nextProject.pages, copiedPage]);
    nextProject.components.push(...copiedComponents);
    nextProject.bindings.push(...copiedBindings);
    nextProject.actions.push(...copiedActions);
    nextProject.settings.activePageId = nextPageId;
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, [], "Page duplicated");
  },

  deletePage(pageId) {
    const state = get();
    if (state.project.pages.length <= 1) {
      set({ status: "Keep at least one page" });
      return;
    }

    const pageIndex = state.project.pages.findIndex((page) => page.pageId === pageId);
    if (pageIndex === -1) {
      return;
    }

    const deletedComponentIds = new Set(
      state.project.components
        .filter((component) => component.pageId === pageId)
        .map((component) => component.componentId),
    );
    const nextProject = cloneProject(state.project);
    nextProject.pages = normalizePageOrders(
      nextProject.pages.filter((page) => page.pageId !== pageId),
    );
    nextProject.components = nextProject.components.filter(
      (component) => !deletedComponentIds.has(component.componentId),
    );
    nextProject.bindings = nextProject.bindings.filter(
      (binding) => !deletedComponentIds.has(binding.componentId),
    );
    nextProject.actions = nextProject.actions
      .filter((action) => !deletedComponentIds.has(action.componentId))
      .map((action) => {
        const nextAction = {
          ...action,
          steps: removeNavigationToPage(action.steps, pageId),
        };
        if (action.elseSteps) {
          return {
            ...nextAction,
            elseSteps: removeNavigationToPage(action.elseSteps, pageId),
          };
        }
        return nextAction;
      });

    if (state.project.settings.activePageId === pageId) {
      const fallbackIndex = Math.max(0, pageIndex - 1);
      nextProject.settings.activePageId =
        nextProject.pages[fallbackIndex]?.pageId ?? nextProject.pages[0]?.pageId ?? "";
    }

    const selectedIds = state.selectedIds.filter((id) => !deletedComponentIds.has(id));
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, selectedIds, "Page deleted");
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
      y: nextComponentY(state.project, page.pageId),
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
    const locked = new Set(
      state.project.components
        .filter((component) => selected.has(component.componentId) && isEditorLocked(component))
        .map((component) => component.componentId),
    );
    const deleteIds = new Set([...selected].filter((componentId) => !locked.has(componentId)));
    if (!deleteIds.size) {
      set({ status: "Selection locked" });
      return;
    }

    const nextProject = cloneProject(state.project);
    nextProject.components = nextProject.components.filter(
      (component) => !deleteIds.has(component.componentId),
    );
    nextProject.bindings = nextProject.bindings.filter(
      (binding) => !deleteIds.has(binding.componentId),
    );
    nextProject.actions = nextProject.actions.filter(
      (action) => !deleteIds.has(action.componentId),
    );
    nextProject.pages = nextProject.pages.map((page) => ({
      ...page,
      componentIds: page.componentIds.filter((componentId) => !deleteIds.has(componentId)),
    }));
    nextProject.updatedAt = new Date().toISOString();
    commit(
      set,
      state,
      nextProject,
      state.selectedIds.filter((componentId) => locked.has(componentId)),
      locked.size ? "Unlocked components deleted" : "Selection deleted",
    );
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
      actions: cloneJson(
        state.project.actions.filter((action) => selected.has(action.componentId)),
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
    const pasted = createComponentCopies({
      components: clipboard.components,
      bindings: clipboard.bindings,
      actions: clipboard.actions,
      pageId: page.pageId,
      offset: 1,
    });

    nextProject.components.push(...pasted.components);
    nextProject.bindings.push(...pasted.bindings);
    nextProject.actions.push(...pasted.actions);
    const nextPage = nextProject.pages.find((candidate) => candidate.pageId === page.pageId);
    nextPage?.componentIds.push(...pasted.components.map((component) => component.componentId));
    nextProject.updatedAt = new Date().toISOString();
    commit(
      set,
      state,
      nextProject,
      pasted.components.map((component) => component.componentId),
      "Pasted",
    );
  },

  duplicateSelected() {
    const state = get();
    const page = getActivePage(state.project);
    const selected = new Set(state.selectedIds);
    const selectedComponents = state.project.components.filter((component) =>
      selected.has(component.componentId),
    );
    if (!page || !selectedComponents.length) {
      set({ status: "Nothing to duplicate" });
      return;
    }

    const duplicated = createComponentCopies({
      components: selectedComponents,
      bindings: state.project.bindings.filter((binding) => selected.has(binding.componentId)),
      actions: state.project.actions.filter((action) => selected.has(action.componentId)),
      pageId: page.pageId,
      offset: 1,
    });
    const nextProject = cloneProject(state.project);

    nextProject.components.push(...duplicated.components);
    nextProject.bindings.push(...duplicated.bindings);
    nextProject.actions.push(...duplicated.actions);
    const nextPage = nextProject.pages.find((candidate) => candidate.pageId === page.pageId);
    nextPage?.componentIds.push(...duplicated.components.map((component) => component.componentId));
    nextProject.updatedAt = new Date().toISOString();
    commit(
      set,
      state,
      nextProject,
      duplicated.components.map((component) => component.componentId),
      "Duplicated",
    );
  },

  toggleSelectedLock() {
    const state = get();
    const selected = new Set(state.selectedIds);
    const selectedComponents = state.project.components.filter((component) =>
      selected.has(component.componentId),
    );
    if (!selectedComponents.length) {
      set({ status: "Nothing selected" });
      return;
    }

    const shouldLock = selectedComponents.some((component) => !isEditorLocked(component));
    const nextProject = cloneProject(state.project);
    nextProject.components = nextProject.components.map((component) =>
      selected.has(component.componentId)
        ? { ...component, style: setEditorLocked(component.style, shouldLock) }
        : component,
    );
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, shouldLock ? "Locked" : "Unlocked");
  },

  toggleSelectedHidden() {
    const state = get();
    const selected = new Set(state.selectedIds);
    const selectedComponents = state.project.components.filter((component) =>
      selected.has(component.componentId),
    );
    if (!selectedComponents.length) {
      set({ status: "Nothing selected" });
      return;
    }

    const shouldHide = selectedComponents.some((component) => !isEditorHidden(component));
    const nextProject = cloneProject(state.project);
    nextProject.components = nextProject.components.map((component) =>
      selected.has(component.componentId)
        ? { ...component, style: setEditorHidden(component.style, shouldHide) }
        : component,
    );
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, shouldHide ? "Hidden" : "Shown");
  },

  nudgeSelected(delta, breakpoint, columns) {
    const state = get();
    const selected = new Set(state.selectedIds);
    if (!selected.size) {
      return;
    }

    const targetBreakpoint = breakpoint ?? state.preview;
    let changed = false;
    const nextProject = cloneProject(state.project);

    nextProject.components = nextProject.components.map((component) => {
      if (!selected.has(component.componentId) || isEditorLocked(component)) {
        return component;
      }

      const placement = getPlacement(component, targetBreakpoint);
      const nextPlacement = columns
        ? clampGridPlacement(
            { ...placement, x: placement.x + delta.x, y: placement.y + delta.y },
            columns,
          )
        : {
            ...placement,
            x: Math.max(0, placement.x + delta.x),
            y: Math.max(0, placement.y + delta.y),
          };
      if (
        nextPlacement.x === placement.x &&
        nextPlacement.y === placement.y &&
        nextPlacement.w === placement.w &&
        nextPlacement.h === placement.h
      ) {
        return component;
      }

      changed = true;
      return {
        ...component,
        layout: {
          ...component.layout,
          [targetBreakpoint]: nextPlacement,
        },
      };
    });

    if (!changed) {
      set({ status: "Selection locked" });
      return;
    }

    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Layout updated");
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

interface ComponentCopyInput {
  components: DashboardComponent[];
  bindings: Binding[];
  actions: DashboardAction[];
  pageId: string;
  offset: number;
}

interface ComponentCopyResult {
  components: DashboardComponent[];
  bindings: Binding[];
  actions: DashboardAction[];
}

function createComponentCopies(input: ComponentCopyInput): ComponentCopyResult {
  const componentIdMap = new Map<string, string>();
  const bindingIdMap = new Map<string, string>();
  const actionIdMap = new Map<string, string>();

  const components = input.components.map((component) => {
    const nextComponent = cloneJson(component);
    const nextComponentId = createId("cmp");
    componentIdMap.set(component.componentId, nextComponentId);
    nextComponent.componentId = nextComponentId;
    nextComponent.pageId = input.pageId;
    nextComponent.name = `${component.name} Copy`;
    nextComponent.bindingIds = [];
    nextComponent.actionIds = [];
    nextComponent.style = clearEditorInteractionFlags(nextComponent.style);
    Object.values(nextComponent.layout).forEach((placement) => {
      placement.x += input.offset;
      placement.y += input.offset;
    });
    return nextComponent;
  });

  const bindings = input.bindings
    .filter((binding) => componentIdMap.has(binding.componentId))
    .map((binding) => {
      const nextBinding = cloneJson(binding);
      const nextBindingId = createId("bind");
      nextBinding.bindingId = nextBindingId;
      nextBinding.componentId = componentIdMap.get(binding.componentId) ?? binding.componentId;
      bindingIdMap.set(binding.bindingId, nextBindingId);
      return nextBinding;
    });

  const actions = input.actions
    .filter((action) => componentIdMap.has(action.componentId))
    .map((action) => {
      const nextAction = cloneJson(action);
      const nextActionId = createId("act");
      nextAction.actionId = nextActionId;
      nextAction.componentId = componentIdMap.get(action.componentId) ?? action.componentId;
      actionIdMap.set(action.actionId, nextActionId);
      return nextAction;
    });

  components.forEach((component) => {
    const sourceComponent = input.components.find(
      (source) => componentIdMap.get(source.componentId) === component.componentId,
    );
    component.bindingIds =
      sourceComponent?.bindingIds
        .map((bindingId) => bindingIdMap.get(bindingId))
        .filter((bindingId): bindingId is string => Boolean(bindingId)) ?? [];
    component.actionIds =
      sourceComponent?.actionIds
        .map((actionId) => actionIdMap.get(actionId))
        .filter((actionId): actionId is string => Boolean(actionId)) ?? [];
  });

  return { components, bindings, actions };
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

function nextComponentY(project: DashboardProject, pageId: string): number {
  return project.components.reduce((max, component) => {
    if (component.pageId !== pageId) {
      return max;
    }
    const placement = getPlacement(component, "desktop");
    return Math.max(max, placement.y + placement.h);
  }, 0);
}

function nextPageOrder(project: DashboardProject): number {
  return project.pages.reduce((max, page) => Math.max(max, page.order), -1) + 1;
}

function normalizePageOrders(pages: Page[]): Page[] {
  return [...pages]
    .sort((left, right) => left.order - right.order)
    .map((page, index) => ({ ...page, order: index }));
}

function uniquePageName(
  project: DashboardProject,
  desiredName: string,
  currentPageId?: string,
): string {
  const existing = new Set(
    project.pages
      .filter((page) => page.pageId !== currentPageId)
      .map((page) => page.name.trim().toLowerCase()),
  );
  if (!existing.has(desiredName.toLowerCase())) {
    return desiredName;
  }

  let index = 2;
  let nextName = `${desiredName} ${index}`;
  while (existing.has(nextName.toLowerCase())) {
    index += 1;
    nextName = `${desiredName} ${index}`;
  }
  return nextName;
}

type ActionSteps = DashboardProject["actions"][number]["steps"];

function remapPageActionSteps(
  steps: ActionSteps,
  sourcePageId: string,
  nextPageId: string,
): ActionSteps {
  return steps.map((step) =>
    step.kind === "navigate" && step.pageId === sourcePageId
      ? { ...step, pageId: nextPageId }
      : step,
  );
}

function removeNavigationToPage(steps: ActionSteps, pageId: string): ActionSteps {
  return steps.filter((step) => !(step.kind === "navigate" && step.pageId === pageId));
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
