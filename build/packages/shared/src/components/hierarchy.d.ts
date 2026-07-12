import type { DashboardComponent } from "../schema/types";
export declare function isLayoutContainer(component: DashboardComponent): boolean;
export declare function getChildComponents(components: DashboardComponent[], parentId: string | undefined): DashboardComponent[];
export declare function getDescendantIds(components: DashboardComponent[], componentIds: Iterable<string>): Set<string>;
export declare function canSetComponentParent(components: DashboardComponent[], componentId: string, parentId: string | undefined): boolean;
