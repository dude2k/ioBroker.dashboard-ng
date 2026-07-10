import type { StateOption } from "@dashboard-ng/shared";

export interface StateTreeNode {
  id: string;
  label: string;
  children: StateTreeNode[];
  states: StateOption[];
  count: number;
}

interface MutableTreeNode {
  id: string;
  label: string;
  children: Map<string, MutableTreeNode>;
  states: StateOption[];
}

export function filterStateOptions(states: StateOption[], query: string): StateOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return states;
  }
  return states.filter((state) => stateSearchText(state).includes(normalized));
}

export function buildStateTree(states: StateOption[]): StateTreeNode[] {
  const roots = new Map<string, MutableTreeNode>();
  states.forEach((state) => {
    const segments = state.id.split(".");
    const groups = segments.length > 1 ? segments.slice(0, -1) : [segments[0] ?? state.id];
    let level = roots;
    let path = "";
    let node: MutableTreeNode | undefined;
    groups.forEach((segment) => {
      path = path ? `${path}.${segment}` : segment;
      node = level.get(segment);
      if (!node) {
        node = { id: path, label: segment, children: new Map(), states: [] };
        level.set(segment, node);
      }
      level = node.children;
    });
    node?.states.push(state);
  });
  return finalizeNodes(roots);
}

export function stateSearchText(state: StateOption): string {
  return [
    state.id,
    state.name,
    ...(state.names ?? []),
    state.role,
    state.type,
    state.unit,
    state.room,
    ...(state.rooms ?? []),
    state.function,
    ...(state.functions ?? []),
    state.aliasTarget,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function finalizeNodes(nodes: Map<string, MutableTreeNode>): StateTreeNode[] {
  return [...nodes.values()]
    .sort((left, right) => left.label.localeCompare(right.label))
    .map((node) => {
      const children = finalizeNodes(node.children);
      const states = [...node.states].sort((left, right) => left.id.localeCompare(right.id));
      return {
        id: node.id,
        label: node.label,
        children,
        states,
        count: states.length + children.reduce((total, child) => total + child.count, 0),
      };
    });
}
