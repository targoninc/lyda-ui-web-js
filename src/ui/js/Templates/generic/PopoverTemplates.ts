import {create, AnyNode, AnyElement, Signal} from "@targoninc/jess";

export class PopoverTemplates {
    private static anchorCounter = 0;

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

    private static positionAtAnchor(popover: HTMLElement, anchor: AnyElement, above = false, rightAlign = false): void {
        const element = anchor as HTMLElement;
        const anchorName = element.style.getPropertyValue("anchor-name")
            || `--lyda-popover-anchor-${++PopoverTemplates.anchorCounter}`;
        element.style.setProperty("anchor-name", anchorName);

        popover.style.position = "fixed";
        popover.style.left = rightAlign ? "auto" : `anchor(${anchorName} left)`;
        popover.style.right = rightAlign ? `anchor(${anchorName} right)` : "auto";
        popover.style.top = above ? "auto" : `calc(anchor(${anchorName} bottom) + 2px)`;
        popover.style.bottom = above ? `calc(anchor(${anchorName} top) + 2px)` : "auto";
    }

    static closeOthers(popover: HTMLElement): void {
        document.querySelectorAll<HTMLElement>("[popover]:popover-open").forEach(open => {
            if (open !== popover) open.hidePopover();
        });
    }

    static showContextMenu(popover: HTMLElement, x: number, y: number): void {
        if (!popover.isConnected) return;
        PopoverTemplates.closeOthers(popover);
        if (popover.matches(":popover-open")) return;
        popover.style.position = "fixed";
        popover.style.top = `${y}px`;
        popover.style.left = `${x}px`;
        popover.style.right = "auto";
        popover.style.bottom = "auto";
        popover.showPopover();
        PopoverTemplates.clampHorizontally(popover);
        PopoverTemplates.attachContextMenuDismissal(popover);
    }

    static showContextMenuAtAnchor(popover: HTMLElement, anchor: AnyElement, above = false, rightAlign = false): void {
        if (!popover.isConnected) return;
        PopoverTemplates.closeOthers(popover);
        if (popover.matches(":popover-open")) return;
        PopoverTemplates.positionAtAnchor(popover, anchor, above, rightAlign);
        popover.showPopover();
        PopoverTemplates.attachContextMenuDismissal(popover);
    }

    private static clampHorizontally(popover: HTMLElement): void {
        const margin = 4;
        const rect = popover.getBoundingClientRect();
        if (rect.left < margin) {
            popover.style.left = `${margin}px`;
            popover.style.right = "auto";
        } else if (rect.right > window.innerWidth - margin) {
            popover.style.left = "auto";
            popover.style.right = `${margin}px`;
        }
    }

    private static attachContextMenuDismissal(popover: HTMLElement): void {
        const onDocumentClick = (e: MouseEvent) => {
            if (!popover.contains(e.target as Node)) {
                popover.hidePopover();
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                popover.hidePopover();
            }
        };
        const onHide = () => {
            document.removeEventListener("click", onDocumentClick);
            document.removeEventListener("keydown", onKeyDown);
            popover.removeEventListener("hidePopover", onHide);
        };
        popover.addEventListener("hidePopover", onHide);
        setTimeout(() => {
            document.addEventListener("click", onDocumentClick);
            document.addEventListener("keydown", onKeyDown);
        }, 0);
    }

    static show(popover: HTMLElement, anchor: AnyElement, above = false, rightAlign = false): void {
        if (popover.matches(":popover-open") || !popover.isConnected) return;
        PopoverTemplates.positionAtAnchor(popover, anchor, above, rightAlign);
        popover.showPopover();
    }

    static hide(popover: HTMLElement): void {
        popover.hidePopover();
    }

    static toggle(popover: HTMLElement, anchor: AnyElement, rightAlign = false, above = false): void {
        if (!popover.isConnected) return;

        if (popover.matches(":popover-open")) {
            popover.hidePopover();
            return;
        }

        PopoverTemplates.positionAtAnchor(popover, anchor, above, rightAlign);
        popover.showPopover();

        if (popover.getAttribute("popover") === "manual") {
            const onDocumentClick = (e: MouseEvent) => {
                if (!popover.contains(e.target as Node) && e.target !== anchor && !anchor.contains(e.target as Node)) {
                    popover.hidePopover();
                }
            };
            const onHide = () => {
                document.removeEventListener("click", onDocumentClick);
                popover.removeEventListener("hidePopover", onHide);
            };
            popover.addEventListener("hidePopover", onHide);
            setTimeout(() => {
                document.addEventListener("click", onDocumentClick);
            }, 0);
        }
    }
}
