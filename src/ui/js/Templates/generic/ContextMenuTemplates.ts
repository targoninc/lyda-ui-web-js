import { create, nullElement, StringOrSignal } from "@targoninc/jess";
import { GenericTemplates } from "./GenericTemplates.ts";
import { PopoverTemplates } from "./PopoverTemplates.ts";

export interface ContextMenuAction<T> {
    label: StringOrSignal;
    icon?: StringOrSignal;
    onclick: (item: T) => void;
    show?: (item: T) => boolean;
}

let ctxUid = 0;
function uid(): string {
    return `ctx-${++ctxUid}`;
}

export class ContextMenuTemplates {
    static create<T>(
        item: T,
        actions: ContextMenuAction<T>[],
        id?: string,
    ) {
        const popId = id || uid();
        const menuItems = ContextMenuTemplates.#buildItems(item, actions);
        const popover = PopoverTemplates.popover(popId, ...menuItems);

        const button = create("button")
            .classes("round-button", "jess", "context-menu-btn")
            .onclick((e: Event) => PopoverTemplates.toggle(popover, e.currentTarget as HTMLElement))
            .children(GenericTemplates.icon("more_horiz", false))
            .build() as HTMLElement;

        const onContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            PopoverTemplates.showAtPoint(popover, e.clientX, e.clientY);
        };

        return { button, popover, onContextMenu };
    }

    static #buildItems<T>(item: T, actions: ContextMenuAction<T>[]): HTMLElement[] {
        return actions
            .filter(a => !a.show || a.show(item))
            .map(a =>
                create("button")
                    .classes("context-menu-item", "flex", "align-children", "small-gap")
                    .onclick(async (e: Event) => {
                        e.stopPropagation();
                        const pop = (e.currentTarget as HTMLElement).closest("[popover]") as HTMLElement | null;
                        if (pop) pop.hidePopover();
                        await a.onclick(item);
                    })
                    .children(
                        a.icon ? GenericTemplates.icon(a.icon, true, ["context-menu-icon"]) : nullElement(),
                        create("span").text(a.label).build(),
                    ).build() as HTMLElement,
            );
    }
}
