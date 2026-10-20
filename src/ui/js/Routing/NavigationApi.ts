interface NavigationWindow {
    navigation?: Navigation;
}

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
