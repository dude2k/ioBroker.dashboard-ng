import type { ComponentType, DashboardComponent, GridPlacement } from "../schema/types";
export interface ComponentCatalogEntry {
    type: ComponentType;
    label: string;
    description: string;
    icon: string;
    defaultSize: Pick<GridPlacement, "w" | "h">;
    defaultProps: Record<string, unknown>;
    implemented: boolean;
}
export declare const componentCatalog: ComponentCatalogEntry[];
export declare function createComponentFromCatalog(type: ComponentType, componentId: string, pageId: string, placement: GridPlacement): DashboardComponent;
export declare function getCatalogEntry(type: ComponentType): ComponentCatalogEntry;
