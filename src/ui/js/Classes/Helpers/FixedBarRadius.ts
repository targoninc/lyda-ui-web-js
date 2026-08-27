// Collapses the top corners of sticky .fixed-bar elements as they scroll into
// the page: the top border-radius goes from the pill start (999px, capped at
// half the bar's own height) to 0px over the first COLLAPSE_DISTANCE px of
// upward travel from the bar's natural in-flow position. The bottom corners
// stay pill-shaped.
//
// Both radii are capped at half the bar's height: with the top corners at 0,
// a larger bottom radius would exceed the opposite-corner sum on each side,
// and the browser's corner-overlap rule would scale it up to the full side
// height, bulging the rounding up the whole side.
//
// STICKY_TOP must match `.fixed-bar { top: ... }` in styles/elements.css.
const STICKY_TOP = 43;
const COLLAPSE_DISTANCE = 11;
const START_RADIUS = 999;

export function initializeFixedBarRadius() {
    // Document-space position of each bar while it is still in flow
    // (not stuck); re-captured whenever the bar un-sticks, so it survives
    // layout shifts from images/fonts and page navigation.
    const naturalTops = new WeakMap<HTMLElement, number>();

    const update = () => {
        const scrollY = window.scrollY;
        for (const bar of document.querySelectorAll<HTMLElement>(".fixed-bar")) {
            const rect = bar.getBoundingClientRect();
            if (rect.top > STICKY_TOP) {
                naturalTops.set(bar, rect.top + scrollY);
            }
            const naturalTop = naturalTops.get(bar) ?? rect.top + scrollY;
            const travel = Math.max(0, naturalTop - rect.top);
            const progress = Math.min(1, travel / COLLAPSE_DISTANCE);
            const pill = Math.min(START_RADIUS, rect.height / 2);
            const top = Math.round((1 - progress) * pill);
            const bottom = Math.round(pill);
            bar.style.borderRadius = `${top}px ${top}px ${bottom}px ${bottom}px`;
        }
    };

    window.addEventListener("scroll", update, {passive: true});
    window.addEventListener("resize", update);
    update();
}
