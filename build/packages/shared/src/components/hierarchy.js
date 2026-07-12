"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLayoutContainer = isLayoutContainer;
exports.getChildComponents = getChildComponents;
exports.getDescendantIds = getDescendantIds;
exports.canSetComponentParent = canSetComponentParent;
function isLayoutContainer(component) {
    return component.type === "container" || component.type === "section";
}
function getChildComponents(components, parentId) {
    return components.filter((component) => component.parentId === parentId);
}
function getDescendantIds(components, componentIds) {
    const result = new Set(componentIds);
    let changed = true;
    while (changed) {
        changed = false;
        components.forEach((component) => {
            if (component.parentId &&
                result.has(component.parentId) &&
                !result.has(component.componentId)) {
                result.add(component.componentId);
                changed = true;
            }
        });
    }
    return result;
}
function canSetComponentParent(components, componentId, parentId) {
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
//# sourceMappingURL=hierarchy.js.map