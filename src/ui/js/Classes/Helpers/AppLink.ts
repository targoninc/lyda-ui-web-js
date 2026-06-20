import { FeatureDetector } from "./FeatureDetector.ts";

const APP_PACKAGE = "com.targoninc.lyda";

const ENTITY_PREFIXES = ["/track/", "/album/", "/playlist/", "/profile/", "/user/"] as const;

/**
 * Determines whether a URL points at the site itself and is an "entity" link
 * the app can deep-link into (track / album / playlist / profile).
 *
 * The result is purely structural — it does NOT assume the app is or isn't
 * installed.
 */
export function isEntityAppLink(href: string): boolean {
    if (!href) return false;
    let url: URL;
    try {
        url = new URL(href, window.location.href);
    } catch {
        return false;
    }
    if (url.origin !== window.location.origin) return false;
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const path = url.pathname;
    return ENTITY_PREFIXES.some(p => path === p.slice(0, -1) || path.startsWith(p));
}

/**
 * Convert a site URL (https://lyda.app/track/123) into an Android intent:// URL
 * with a browser fallback. The OS routes this to the app if installed, otherwise
 * the browser opens the fallback URL.
 *
 * The fallback URL is tagged with `?inapp=1` so that, if the browser does
 * end up loading the fallback (app not installed), the page knows it was a
 * fallback navigation and won't loop back into another app-open attempt.
 */
export function toAndroidIntentUrl(href: string): string {
    const url = new URL(href, window.location.href);
    const pathAndQuery = url.pathname + url.search;
    const fallback = new URL(url.toString());
    fallback.searchParams.set("inapp", "1");
    return `intent://lyda.app${pathAndQuery}#Intent;scheme=https;package=${APP_PACKAGE};S.browser_fallback_url=${encodeURI(fallback.toString())};end`;
}

/**
 * Did the user arrive at the current page from outside the site itself?
 *
 * An empty referrer (typed URL, opened from a system share sheet, opened from
 * a chat app that doesn't set Referer, etc.) is treated as "from a link"
 * because the user explicitly chose to open this URL from somewhere else.
 * A same-origin referrer means the user was already on the site and clicked
 * an internal link — in that case we do NOT try to open the app.
 *
 * Also returns false if the URL has been tagged as a fallback (the
 * `?inapp=1` query param is set by the Android intent's browser fallback).
 * Without this guard, an Android device without the app would loop: the
 * intent:// falls back to the same URL, the page reloads, the check runs
 * again, and the cycle continues.
 */
function cameFromExternalLink(): boolean {
    const params = new URLSearchParams(window.location.search);
    if (params.get("inapp") === "1") return false;

    const ref = document.referrer;
    if (!ref) return true;
    try {
        return new URL(ref).origin !== window.location.origin;
    } catch {
        return true;
    }
}

/**
 * Decide whether we should attempt to open the app for the *current* page.
 *
 * - iOS: yes if the user came from an external link and the URL is an entity.
 *   The AASA on lyda.app handles the actual handoff (silent if app installed,
 *   web if not).
 * - Android: same trigger, uses intent:// for the handoff.
 * - Desktop / in-site navigation: no.
 */
export function shouldAttemptAppOpenForCurrentPage(): boolean {
    if (!FeatureDetector.isMobile()) return false;
    if (!cameFromExternalLink()) return false;
    return isEntityAppLink(window.location.href);
}

/**
 * Try to open the app for the *current* page. Used at initial page load
 * when the user came from an external link (messenger, email, notes, etc.).
 *
 * - iOS: no JS work. The browser handles Universal Links via the
 *   apple-app-site-association at lyda.app/.well-known/apple-app-site-association.
 *   If the AASA matches and the app is installed, the app opens (the first
 *   time iOS shows a one-time "Open in Lyda?" prompt; after that it's
 *   automatic). If the AASA doesn't match or the app isn't installed, the
 *   browser loads the web URL. We deliberately do NOT try the `lyda://`
 *   custom scheme, because that surfaces a "Cannot open page" alert on
 *   devices without the app — which is exactly the disturbance we want to
 *   avoid.
 *
 * - Android: navigates to an `intent://` URL with a browser fallback. The
 *   OS switches to the app if installed, otherwise the browser opens the
 *   fallback URL. No JS-level timeout, no prompt, no popup.
 *
 * - Desktop / unknown / already-on-site: no-op.
 *
 * Critically, this function does NOT assume the app exists or doesn't exist.
 * It just tries. There is no pre-detection ping, no localStorage flag, no
 * banner. Whatever the OS reports is what we react to. The fallback is
 * identical to the user having arrived at the web page with no JS
 * intervention.
 */
export function attemptOpenCurrentPageInApp(): boolean {
    if (!shouldAttemptAppOpenForCurrentPage()) return false;

    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid) {
        // iOS: let the OS handle Universal Links via the AASA. We do nothing
        // here on purpose — trying a custom scheme would be worse.
        return true;
    }

    try {
        window.location.replace(toAndroidIntentUrl(window.location.href));
        return true;
    } catch {
        return false;
    }
}
