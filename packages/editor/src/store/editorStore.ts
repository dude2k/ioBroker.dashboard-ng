import { create, type StoreApi } from "zustand";
import {
  createComponentFromCatalog,
  createDefaultDashboard,
  type DeviceMapping,
  getCatalogEntry,
  type ActionCondition,
  type Binding,
  type BindingMode,
  type BindingTransform,
  type ActionStep,
  type ActionTrigger,
  type DashboardAction,
  type ComponentType,
  type DashboardBreakpoint,
  type DashboardComponent,
  type DashboardProject,
  type GridPlacement,
  type Page,
  type StatePrimitive,
  type VisibilityRule,
} from "@dashboard-ng/shared";
import { clampGridPlacement, type ConditionalStyleRule } from "@dashboard-ng/runtime";
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
export type VisibilityOperator = "equals" | "notEquals" | "greaterThan" | "lessThan";
export type ActionStepBranch = "steps" | "elseSteps";

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
  replaceProject(project: DashboardProject, status?: string): void;
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
  setComponentBinding(
    componentId: string,
    target: string,
    stateId: string,
    mode: BindingMode,
  ): void;
  setComponentFormulaBinding(
    componentId: string,
    target: string,
    stateId: string | undefined,
    formula: string,
  ): void;
  setComponentBindingTransform(
    componentId: string,
    target: string,
    transform: BindingTransform | undefined,
  ): void;
  applyComponentDeviceMapping(componentId: string, mapping: DeviceMapping): void;
  removeComponentBinding(componentId: string, target: string): void;
  setPrimaryBinding(componentId: string, stateId: string, mode: BindingMode): void;
  addComponentAction(componentId: string, trigger: ActionTrigger): void;
  updateComponentActionTrigger(actionId: string, trigger: ActionTrigger): void;
  setComponentActionCondition(actionId: string, condition: ActionCondition | undefined): void;
  updateComponentActionStep(
    actionId: string,
    stepIndex: number,
    step: ActionStep,
    branch?: ActionStepBranch,
  ): void;
  addComponentActionStep(actionId: string, branch?: ActionStepBranch): void;
  removeComponentActionStep(actionId: string, stepIndex: number, branch?: ActionStepBranch): void;
  removeComponentAction(actionId: string): void;
  setAdvancedMode(enabled: boolean): void;
  setComponentVisibility(componentId: string, visibility: VisibilityRule): void;
  setComponentVisibilityCondition(
    componentId: string,
    stateId: string,
    operator: VisibilityOperator,
    expected: StatePrimitive,
  ): void;
  setComponentConditionalStyle(componentId: string, rule: ConditionalStyleRule | undefined): void;
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

  replaceProject(project, status = "Project updated") {
    const state = get();
    commit(set, state, project, [], status);
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

  setComponentBinding(componentId, target, stateId, mode) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const component = nextProject.components.find((item) => item.componentId === componentId);
    if (!component) {
      return;
    }

    let binding = nextProject.bindings.find(
      (item) => item.componentId === componentId && item.target === target,
    );
    if (
      binding &&
      target === "value" &&
      (component.type === "light-card" || component.type === "scene-button")
    ) {
      removeGeneratedActionsForState(nextProject, component, binding.stateId);
    }
    if (!binding) {
      binding = {
        bindingId: createId("bind"),
        componentId,
        target,
        kind: "state",
        mode,
        stateId,
        missing: false,
      };
      nextProject.bindings.push(binding);
      component.bindingIds = uniqueIds([...component.bindingIds, binding.bindingId]);
    } else {
      binding.kind = "state";
      binding.mode = mode;
      binding.stateId = stateId;
      binding.missing = false;
      delete binding.formula;
    }

    if (target === "value" && component.type === "light-card") {
      ensureToggleAction(nextProject, component, stateId);
    }
    if (target === "value" && component.type === "scene-button") {
      ensureSetStateAction(nextProject, component, stateId);
    }

    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Binding updated");
  },

  setComponentFormulaBinding(componentId, target, stateId, formula) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const component = nextProject.components.find((item) => item.componentId === componentId);
    if (!component) {
      return;
    }

    let binding = nextProject.bindings.find(
      (item) => item.componentId === componentId && item.target === target,
    );
    if (
      binding &&
      target === "value" &&
      (component.type === "light-card" || component.type === "scene-button")
    ) {
      removeGeneratedActionsForState(nextProject, component, binding.stateId);
    }
    if (!binding) {
      binding = {
        bindingId: createId("bind"),
        componentId,
        target,
        kind: "formula",
        mode: "read",
        formula,
        missing: false,
      };
      if (stateId) {
        binding.stateId = stateId;
      }
      nextProject.bindings.push(binding);
      component.bindingIds = uniqueIds([...component.bindingIds, binding.bindingId]);
    } else {
      binding.kind = "formula";
      binding.mode = "read";
      binding.formula = formula;
      binding.missing = false;
      if (stateId) {
        binding.stateId = stateId;
      } else {
        delete binding.stateId;
      }
    }

    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Formula binding updated");
  },

  setComponentBindingTransform(componentId, target, transform) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const binding = nextProject.bindings.find(
      (item) => item.componentId === componentId && item.target === target,
    );
    if (!binding) {
      return;
    }

    if (transform && Object.values(transform).some((value) => value !== undefined)) {
      binding.transform = transform;
    } else {
      delete binding.transform;
    }
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Value transform updated");
  },

  applyComponentDeviceMapping(componentId, mapping) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const component = nextProject.components.find((item) => item.componentId === componentId);
    if (!component) {
      return;
    }

    let added = 0;
    mapping.bindings.forEach((mapped) => {
      const existing = nextProject.bindings.find(
        (binding) => binding.componentId === componentId && binding.target === mapped.target,
      );
      if (existing) {
        return;
      }
      const binding: Binding = {
        bindingId: createId("bind"),
        componentId,
        target: mapped.target,
        kind: "state",
        mode: mapped.mode,
        stateId: mapped.stateId,
        missing: false,
      };
      nextProject.bindings.push(binding);
      component.bindingIds = uniqueIds([...component.bindingIds, binding.bindingId]);
      added += 1;

      if (mapped.target === "value" && component.type === "light-card") {
        ensureToggleAction(nextProject, component, mapped.stateId);
      }
      if (mapped.target === "value" && component.type === "scene-button") {
        ensureSetStateAction(nextProject, component, mapped.stateId);
      }
    });
    if (!added) {
      return;
    }
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, `${mapping.kind} device mapped`);
  },

  removeComponentBinding(componentId, target) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const component = nextProject.components.find((item) => item.componentId === componentId);
    if (!component) {
      return;
    }
    const binding = nextProject.bindings.find(
      (item) => item.componentId === componentId && item.target === target,
    );
    if (!binding) {
      return;
    }

    nextProject.bindings = nextProject.bindings.filter(
      (item) => item.bindingId !== binding.bindingId,
    );
    component.bindingIds = component.bindingIds.filter(
      (bindingId) => bindingId !== binding.bindingId,
    );
    removeGeneratedActionsForState(nextProject, component, binding.stateId);
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Binding removed");
  },

  setPrimaryBinding(componentId, stateId, mode) {
    get().setComponentBinding(componentId, "value", stateId, mode);
  },

  addComponentAction(componentId, trigger) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const component = nextProject.components.find((item) => item.componentId === componentId);
    if (!component) {
      return;
    }

    const existing = nextProject.actions.find(
      (action) => action.componentId === componentId && action.trigger === trigger,
    );
    if (existing) {
      existing.steps.push(defaultActionStep(nextProject));
      nextProject.updatedAt = new Date().toISOString();
      commit(set, state, nextProject, state.selectedIds, "Action step added");
      return;
    }

    const action: DashboardAction = {
      actionId: createId("act"),
      componentId,
      trigger,
      steps: [defaultActionStep(nextProject)],
    };
    nextProject.actions.push(action);
    component.actionIds = uniqueIds([...component.actionIds, action.actionId]);
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Action added");
  },

  updateComponentActionTrigger(actionId, trigger) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const action = nextProject.actions.find((item) => item.actionId === actionId);
    if (!action || action.trigger === trigger) {
      return;
    }
    action.trigger = trigger;
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Action updated");
  },

  setComponentActionCondition(actionId, condition) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const action = nextProject.actions.find((item) => item.actionId === actionId);
    if (!action) {
      return;
    }
    if (condition) {
      action.condition = condition;
    } else {
      delete action.condition;
      delete action.elseSteps;
    }
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Action condition updated");
  },

  updateComponentActionStep(actionId, stepIndex, step, branch = "steps") {
    const state = get();
    const nextProject = cloneProject(state.project);
    const action = nextProject.actions.find((item) => item.actionId === actionId);
    const steps = action ? action[branch] : undefined;
    if (!action || !steps?.[stepIndex]) {
      return;
    }
    steps[stepIndex] = step;
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Action updated");
  },

  addComponentActionStep(actionId, branch = "steps") {
    const state = get();
    const nextProject = cloneProject(state.project);
    const action = nextProject.actions.find((item) => item.actionId === actionId);
    if (!action) {
      return;
    }
    if (branch === "elseSteps") {
      action.elseSteps = [...(action.elseSteps ?? []), defaultActionStep(nextProject)];
    } else {
      action.steps.push(defaultActionStep(nextProject));
    }
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Action step added");
  },

  removeComponentActionStep(actionId, stepIndex, branch = "steps") {
    const state = get();
    const nextProject = cloneProject(state.project);
    const action = nextProject.actions.find((item) => item.actionId === actionId);
    const steps = action ? action[branch] : undefined;
    if (!action || !steps?.[stepIndex]) {
      return;
    }
    steps.splice(stepIndex, 1);
    if (branch === "elseSteps" && !steps.length) {
      delete action.elseSteps;
    } else if (!action.steps.length) {
      action.steps.push(defaultActionStep(nextProject));
    }
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Action step removed");
  },

  removeComponentAction(actionId) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const action = nextProject.actions.find((item) => item.actionId === actionId);
    if (!action) {
      return;
    }
    const component = nextProject.components.find(
      (item) => item.componentId === action.componentId,
    );
    nextProject.actions = nextProject.actions.filter((item) => item.actionId !== actionId);
    if (component) {
      component.actionIds = component.actionIds.filter((item) => item !== actionId);
    }
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Action removed");
  },

  setAdvancedMode(enabled) {
    const state = get();
    if (state.project.settings.advancedMode === enabled) {
      return;
    }
    const nextProject = cloneProject(state.project);
    nextProject.settings.advancedMode = enabled;
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Advanced mode updated");
  },

  setComponentVisibility(componentId, visibility) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const component = nextProject.components.find((item) => item.componentId === componentId);
    if (!component) {
      return;
    }
    if (visibility.kind === "always" || visibility.kind === "formula") {
      removeVisibilityBinding(nextProject, component);
    }
    component.visibility = visibility;
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Visibility updated");
  },

  setComponentVisibilityCondition(componentId, stateId, operator, expected) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const component = nextProject.components.find((item) => item.componentId === componentId);
    if (!component) {
      return;
    }
    const binding = ensureVisibilityBinding(nextProject, component, stateId);
    component.visibility =
      operator === "equals"
        ? { kind: "binding", bindingId: binding.bindingId, expected }
        : {
            kind: "formula",
            bindingId: binding.bindingId,
            formula: visibilityFormulaForOperator(operator),
            expected,
          };
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Visibility updated");
  },

  setComponentConditionalStyle(componentId, rule) {
    const state = get();
    const nextProject = cloneProject(state.project);
    const component = nextProject.components.find((item) => item.componentId === componentId);
    if (!component) {
      return;
    }
    if (!rule?.enabled) {
      removeStyleBinding(nextProject, component);
      const { conditional: _conditional, ...restStyle } = component.style;
      component.style = restStyle;
    } else {
      if (rule.operator !== "formula" && rule.stateId) {
        ensureStyleBinding(nextProject, component, rule.stateId);
      } else {
        removeStyleBinding(nextProject, component);
      }
      component.style = { ...component.style, conditional: rule };
    }
    nextProject.updatedAt = new Date().toISOString();
    commit(set, state, nextProject, state.selectedIds, "Conditional style updated");
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

export function getComponentBinding(
  project: DashboardProject,
  component: DashboardComponent,
  target = "value",
) {
  return project.bindings.find(
    (binding) => binding.componentId === component.componentId && binding.target === target,
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
    component.actionIds = uniqueIds([...component.actionIds, action.actionId]);
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
    component.actionIds = uniqueIds([...component.actionIds, action.actionId]);
  }
  action.steps = [{ kind: "setState", stateId, value: true }];
}

function defaultActionStep(project: DashboardProject): ActionStep {
  const pageId = project.pages[0]?.pageId;
  if (pageId) {
    return { kind: "navigate", pageId };
  }
  return { kind: "openUrl", url: "", newWindow: false };
}

function removeGeneratedActionsForState(
  project: DashboardProject,
  component: DashboardComponent,
  stateId: string | undefined,
): void {
  if (!stateId) {
    return;
  }
  const removeActionIds = new Set(
    project.actions
      .filter(
        (action) =>
          action.componentId === component.componentId &&
          action.trigger === "tap" &&
          action.steps.length === 1 &&
          actionStepTargetsState(action.steps[0], stateId),
      )
      .map((action) => action.actionId),
  );
  if (!removeActionIds.size) {
    return;
  }
  project.actions = project.actions.filter((action) => !removeActionIds.has(action.actionId));
  component.actionIds = component.actionIds.filter((actionId) => !removeActionIds.has(actionId));
}

function ensureVisibilityBinding(
  project: DashboardProject,
  component: DashboardComponent,
  stateId: string,
): Binding {
  let binding = project.bindings.find(
    (candidate) =>
      candidate.componentId === component.componentId && candidate.target === "visibility",
  );
  if (!binding) {
    binding = {
      bindingId: createId("bind"),
      componentId: component.componentId,
      target: "visibility",
      kind: "state",
      mode: "read",
      stateId,
      missing: false,
    };
    project.bindings.push(binding);
    component.bindingIds = uniqueIds([...component.bindingIds, binding.bindingId]);
  } else {
    binding.kind = "state";
    binding.mode = "read";
    binding.stateId = stateId;
    binding.missing = false;
  }
  return binding;
}

function removeVisibilityBinding(project: DashboardProject, component: DashboardComponent): void {
  const binding = project.bindings.find(
    (candidate) =>
      candidate.componentId === component.componentId && candidate.target === "visibility",
  );
  if (!binding) {
    return;
  }
  project.bindings = project.bindings.filter(
    (candidate) => candidate.bindingId !== binding.bindingId,
  );
  component.bindingIds = component.bindingIds.filter(
    (bindingId) => bindingId !== binding.bindingId,
  );
}

function ensureStyleBinding(
  project: DashboardProject,
  component: DashboardComponent,
  stateId: string,
): Binding {
  let binding = project.bindings.find(
    (candidate) => candidate.componentId === component.componentId && candidate.target === "style",
  );
  if (!binding) {
    binding = {
      bindingId: createId("bind"),
      componentId: component.componentId,
      target: "style",
      kind: "state",
      mode: "read",
      stateId,
      missing: false,
    };
    project.bindings.push(binding);
    component.bindingIds = uniqueIds([...component.bindingIds, binding.bindingId]);
  } else {
    binding.kind = "state";
    binding.mode = "read";
    binding.stateId = stateId;
    binding.missing = false;
  }
  return binding;
}

function removeStyleBinding(project: DashboardProject, component: DashboardComponent): void {
  const binding = project.bindings.find(
    (candidate) => candidate.componentId === component.componentId && candidate.target === "style",
  );
  if (!binding) {
    return;
  }
  project.bindings = project.bindings.filter(
    (candidate) => candidate.bindingId !== binding.bindingId,
  );
  component.bindingIds = component.bindingIds.filter(
    (bindingId) => bindingId !== binding.bindingId,
  );
}

function visibilityFormulaForOperator(operator: VisibilityOperator): string {
  switch (operator) {
    case "notEquals":
      return "value != expected";
    case "greaterThan":
      return "value > expected";
    case "lessThan":
      return "value < expected";
    case "equals":
      return "value == expected";
  }
}

function actionStepTargetsState(step: ActionSteps[number] | undefined, stateId: string): boolean {
  if (!step) {
    return false;
  }
  return (
    (step.kind === "setState" || step.kind === "toggleState" || step.kind === "runScene") &&
    step.stateId === stateId
  );
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
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
