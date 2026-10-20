interface NavigationWindow {
    navigation?: Navigation;
}

/**
 * The Navigation API is typed by the native TypeScript compiler (tsgo) used by
 * this project. Browsers without the API (e.g. Firefox) return undefined, and
 * the router falls back to popstate there.
 */
export function getNavigation(): Navigation | null {
    return (window as unknown as NavigationWindow).navigation ?? null;
}

export function isSameOrigin(url: string): boolean {
    try {
        return new URL(url).origin === window.location.origin;
    } catch {
        return false;
    }
}

export function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}
