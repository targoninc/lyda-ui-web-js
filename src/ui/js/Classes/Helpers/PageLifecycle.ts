import { sweepDetachedSubscriptions } from "@targoninc/jess";
import { sweepDetachedSubscriptions as sweepComponentsDetachedSubscriptions } from "@targoninc/jess-components";

/**
 * Page-scoped disposal for the SPA router.
 *
 * Signal subscriptions no longer need manual disposal: jess drops every
 * subscription bound to a DOM node as soon as that node leaves the document
 * (checked on every signal fire and by a sweep interval), and prunes
 * compute/when chains whose outputs lose their last consumer. This module
 * handles the page-scoped resources jess does not know about: intervals,
 * arbitrary cleanup callbacks, and open popovers/modals.
 *
 * Anything registered through `trackInterval`/`trackCleanup` between
 * `beginPageRender` and the next `disposePageRender` belongs to that page and
 * is released with it. Everything registered outside a page render (startup,
 * navbar, player) is never touched.
 */

interface PageScope {
    intervals: ReturnType<typeof setInterval>[];
    cleanups: Array<() => void>;
}

let activeScope: PageScope | null = null;

/** Starts a new page scope. Intervals/cleanups registered until the next
 *  `disposePageRender` belong to this page and are released with it. */
export function beginPageRender(): void {
    activeScope = { intervals: [], cleanups: [] };
}

/** Releases everything registered since the last `beginPageRender`, closes
 *  the page's popovers/modals, and clears its intervals/cleanups. */
export function disposePageRender(): void {
    const scope = activeScope;
    activeScope = null;
    if (scope) {
        for (const intervalId of scope.intervals) {
            clearInterval(intervalId);
        }
        for (const cleanup of scope.cleanups) {
            try {
                cleanup();
            } catch {
                // A failing cleanup must not prevent the rest of the page from being disposed.
            }
        }
    }

    // Popovers keep document-level click/keydown listeners until they are
    // hidden. Hide open ones so their hide handlers run before the container
    // is wiped.
    document.querySelectorAll<HTMLElement>("[popover]:popover-open").forEach(popover => {
        popover.hidePopover();
    });

    // Modals live on <body> (outside the page container); they must not
    // outlive the page that opened them.
    document.querySelectorAll(".modal-container").forEach(modal => {
        modal.remove();
    });
}

/** Releases jess subscriptions bound to elements that left the document.
 *  Call after the page container has been emptied — those elements are
 *  certain garbage, so the grace period is bypassed. Both the jess registry
 *  and the one bundled inside jess-components need sweeping. */
export function releaseDetachedSubscriptions(): void {
    sweepDetachedSubscriptions(true);
    sweepComponentsDetachedSubscriptions(true);
}

/** Registers an interval to be cleared when the current page is disposed. */
export function trackInterval(intervalId: ReturnType<typeof setInterval>): void {
    activeScope?.intervals.push(intervalId);
}

/** Registers a cleanup callback to run when the current page is disposed. */
export function trackCleanup(cleanup: () => void): void {
    activeScope?.cleanups.push(cleanup);
}
