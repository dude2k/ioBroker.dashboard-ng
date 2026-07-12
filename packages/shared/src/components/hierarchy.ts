import type { DashboardComponent } from "../schema/types";

export function isLayoutContainer(component: DashboardComponent): boolean {
  return component.type === "container" || component.type === "section";
}

export function getChildComponents(
  components: DashboardComponent[],
  parentId: string | undefined,
): DashboardComponent[] {
  return components.filter((component) => component.parentId === parentId);
}

export function getDescendantIds(
  components: DashboardComponent[],
  componentIds: Iterable<string>,
): Set<string> {
  const result = new Set(componentIds);
  let changed = true;
  while (changed) {
    changed = false;
    components.forEach((component) => {
      if (
        component.parentId &&
        result.has(component.parentId) &&
        !result.has(component.componentId)
      ) {
        result.add(component.componentId);
        changed = true;
      }
    });
  }
  return result;
}

export function canSetComponentParent(
  components: DashboardComponent[],
  componentId: string,
  parentId: string | undefined,
): boolean {
  if (!parentId) {
    return true;
  }
  const component = components.find((item) => item.componentId === componentId);
  const parent = components.find((item) => item.componentId === parentId);
  if (!component || !parent || component.pageId !== parent.pageId || !isLayoutContainer(parent)) {
    return false;
  }
  return !getDescendantIds(components, [componentId]).has(parentId);
}
