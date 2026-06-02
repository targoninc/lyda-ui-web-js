import {create, AnyNode, AnyElement, DomNode, Signal} from "@targoninc/jess";

export class PopoverTemplates {
    static popover(id: string, ...children: AnyNode[]): HTMLElement {
        return create("div")
            .classes("generic-popover")
            .id(id)
            .attributes("popover", "auto")
            .children(...children)
            .build() as HTMLElement;
    }

    static manualPopover(id: string, ...children: (HTMLElement | SVGElement | Signal<HTMLElement | SVGElement>)[]): HTMLElement {
        return create("div")
            .classes("generic-popover")
            .id(id)
            .attributes("popover", "manual")
            .children(...children)
            .build() as HTMLElement;
    }

    static positionAtAnchor(popover: HTMLElement, anchor: AnyElement, above = false, rightAlign = false): void {
        const r = anchor.getBoundingClientRect();
        popover.style.position = "fixed";
        if (rightAlign) {
            popover.style.left = "auto";
            popover.style.right = `${window.innerWidth - r.right}px`;
        } else {
            popover.style.left = `${Math.max(4, r.left)}px`;
            popover.style.right = "auto";
        }
        if (above) {
            popover.style.top = "auto";
            popover.style.bottom = `${window.innerHeight - r.top + 2}px`;
        } else {
            popover.style.top = `${r.bottom + 2}px`;
            popover.style.bottom = "auto";
        }
    }

    static showAtPoint(popover: HTMLElement, x: number, y: number): void {
        if (popover.matches(":popover-open") || !popover.isConnected) return;
        popover.style.position = "fixed";
        popover.style.top = `${y}px`;
        popover.style.left = `${x}px`;
        popover.style.right = "auto";
        popover.style.bottom = "auto";
        popover.showPopover();
    }

    static show(popover: HTMLElement, anchor: AnyElement, above = false, rightAlign = false): void {
        if (popover.matches(":popover-open") || !popover.isConnected) return;
        PopoverTemplates.positionAtAnchor(popover, anchor, above, rightAlign);
        popover.showPopover();
    }

    static hide(popover: HTMLElement): void {
        popover.hidePopover();
    }

    static toggle(popover: HTMLElement, anchor: AnyElement, rightAlign = false): void {
        if (!popover.isConnected) return;
        PopoverTemplates.positionAtAnchor(popover, anchor, false, rightAlign);
        popover.togglePopover();
    }
}
