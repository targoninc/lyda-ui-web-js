// Adjusts the top corners of sticky .fixed-bar elements as they scroll under
// the sticky nav: the top border-radius goes from the pill start (999px,
// capped at half the bar's own height) to 0px while the bar's top edge
// travels from the nav's bottom edge to its sticky position beneath it.
// Bars that have not reached the nav keep their full pill shape, no matter
// how far down the page they start; only the bar's own position relative to
// the nav drives the transition, never the raw scroll offset.
//
// Both radii are capped at half the bar's height: with the top corners at 0,
// a larger bottom radius would exceed the opposite-corner sum on each side,
// and the browser's corner-overlap rule would scale it up to the full side
// height, bulging the rounding up the whole side.
//
// STICKY_TOP must match `.fixed-bar { top: ... }` in styles/elements.css.
const STICKY_TOP = 43;
const START_RADIUS = 999;

export function initializeFixedBarRadius() {
    const update = () => {
        const nav = document.querySelector("nav");
        const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
        // How far the bar's top edge travels below the nav's bottom edge
        // before it reaches its sticky position.
        const overlapRange = Math.max(0, navBottom - STICKY_TOP);
        for (const bar of document.querySelectorAll<HTMLElement>(".fixed-bar")) {
            const rect = bar.getBoundingClientRect();
            const overlap = navBottom - rect.top;
            const progress = overlapRange > 0
                ? Math.min(1, Math.max(0, overlap / overlapRange))
                : (overlap > 0 ? 1 : 0);
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
