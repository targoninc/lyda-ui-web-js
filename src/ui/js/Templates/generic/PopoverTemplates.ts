import {create, AnyNode, AnyElement, Signal} from "@targoninc/jess";

export class PopoverTemplates {
    private static anchoredCleanups = new WeakMap<HTMLElement, () => void>();
    private static anchorCounter = 0;
    private static readonly supportsAnchorPositioning = typeof CSS !== "undefined" &&
        CSS.supports("anchor-name: --lyda-popover-anchor") &&
        CSS.supports("top: anchor(--lyda-popover-anchor bottom)");

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
        popover.style.position = "fixed";

        if (PopoverTemplates.supportsAnchorPositioning) {
            const anchorName = PopoverTemplates.anchorName(anchor);
            popover.style.setProperty("position-anchor", anchorName);
            if (rightAlign) {
                popover.style.left = "auto";
                popover.style.right = `anchor(${anchorName} right)`;
            } else {
                popover.style.left = `anchor(${anchorName} left)`;
                popover.style.right = "auto";
            }
            if (above) {
                popover.style.top = "auto";
                popover.style.bottom = `calc(anchor(${anchorName} top) + 2px)`;
            } else {
                popover.style.top = `calc(anchor(${anchorName} bottom) + 2px)`;
                popover.style.bottom = "auto";
            }
            return;
        }

        const r = anchor.getBoundingClientRect();
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

    private static anchorName(anchor: AnyElement): string {
        const element = anchor as HTMLElement;
        const existing = element.style.getPropertyValue("anchor-name").split(",")[0]?.trim();
        if (existing) {
            return existing;
        }

        const name = `--lyda-popover-anchor-${++PopoverTemplates.anchorCounter}`;
        element.style.setProperty("anchor-name", name);
        return name;
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
        if (!PopoverTemplates.supportsAnchorPositioning) {
            PopoverTemplates.clampHorizontally(popover);
        }
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
        if (!PopoverTemplates.supportsAnchorPositioning) {
            PopoverTemplates.trackAnchor(popover, anchor, above, rightAlign);
        }
    }

    static hide(popover: HTMLElement): void {
        popover.hidePopover();
    }

    private static trackAnchor(popover: HTMLElement, anchor: AnyElement, above: boolean, rightAlign: boolean): void {
        PopoverTemplates.anchoredCleanups.get(popover)?.();

        let frame: number | null = null;
        const reposition = () => {
            if (!popover.matches(":popover-open")) return;
            PopoverTemplates.positionAtAnchor(popover, anchor, above, rightAlign);
        };
        const schedule = () => {
            if (frame !== null) return;
            frame = requestAnimationFrame(() => {
                frame = null;
                reposition();
            });
        };

        const anchorElement = anchor as HTMLElement;
        const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
        observer?.observe(anchorElement);
        if (anchorElement.parentElement) {
            observer?.observe(anchorElement.parentElement);
        }
        observer?.observe(document.documentElement);

        window.addEventListener("scroll", schedule, true);
        window.addEventListener("resize", schedule);

        const cleanup = () => {
            if (frame !== null) {
                cancelAnimationFrame(frame);
            }
            observer?.disconnect();
            window.removeEventListener("scroll", schedule, true);
            window.removeEventListener("resize", schedule);
            popover.removeEventListener("hidePopover", cleanup);
            PopoverTemplates.anchoredCleanups.delete(popover);
        };

        PopoverTemplates.anchoredCleanups.set(popover, cleanup);
        popover.addEventListener("hidePopover", cleanup);
    }

    static toggle(popover: HTMLElement, anchor: AnyElement, rightAlign = false, above = false): void {
        if (!popover.isConnected) return;

        if (popover.matches(":popover-open")) {
            popover.hidePopover();
            return;
        }

        PopoverTemplates.positionAtAnchor(popover, anchor, above, rightAlign);
        popover.showPopover();
        if (!PopoverTemplates.supportsAnchorPositioning) {
            PopoverTemplates.trackAnchor(popover, anchor, above, rightAlign);
        }

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
