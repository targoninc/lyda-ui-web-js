import { create, AnyNode } from "@targoninc/jess";

export class PopoverTemplates {
    static popover(id: string, ...children: AnyNode[]): HTMLElement {
        return create("div")
            .classes("generic-popover")
            .id(id)
            .attributes("popover", "auto")
            .children(...children)
            .build() as HTMLElement;
    }

    static manualPopover(id: string, ...children: AnyNode[]): HTMLElement {
        return create("div")
            .classes("generic-popover")
            .id(id)
            .attributes("popover", "manual")
            .children(...children)
            .build() as HTMLElement;
    }

    static positionAtAnchor(popover: HTMLElement, anchor: HTMLElement): void {
        const r = anchor.getBoundingClientRect();
        popover.style.position = "fixed";
        popover.style.top = `${r.bottom + 2}px`;
        popover.style.left = `${Math.max(4, r.left)}px`;
        popover.style.right = "auto";
        popover.style.bottom = "auto";
    }

    static showAtPoint(popover: HTMLElement, x: number, y: number): void {
        if (popover.matches(":popover-open")) return;
        popover.style.position = "fixed";
        popover.style.top = `${y}px`;
        popover.style.left = `${x}px`;
        popover.style.right = "auto";
        popover.style.bottom = "auto";
        popover.showPopover();
    }

    static show(popover: HTMLElement, anchor: HTMLElement): void {
        if (popover.matches(":popover-open")) return;
        PopoverTemplates.positionAtAnchor(popover, anchor);
        popover.showPopover();
    }

    static hide(popover: HTMLElement): void {
        popover.hidePopover();
    }

    static toggle(popover: HTMLElement, anchor: HTMLElement): void {
        PopoverTemplates.positionAtAnchor(popover, anchor);
        popover.togglePopover();
    }
}
