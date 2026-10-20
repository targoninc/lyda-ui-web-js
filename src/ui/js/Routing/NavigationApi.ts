export type AppNavigationType = "push" | "replace" | "reload" | "traverse";

export interface AppNavigationDestination {
    readonly url: string;
}

export interface AppNavigationInterceptOptions {
    handler: () => void | Promise<void>;
}

export interface AppNavigateEvent extends Event {
    readonly canIntercept: boolean;
    readonly destination: AppNavigationDestination;
    readonly downloadRequest: string | null;
    readonly hashChange: boolean;
    readonly info?: unknown;
    readonly navigationType: AppNavigationType;
    readonly userInitiated: boolean;

    intercept(options: AppNavigationInterceptOptions): void;
}

export interface AppNavigation extends EventTarget {
    readonly currentEntry: { readonly url: string } | null;

    navigate(url: string, options?: {
        history?: "auto" | "push" | "replace";
        info?: unknown;
    }): Promise<unknown>;
}

interface NavigationWindow {
    navigation?: AppNavigation;
}

export function getNavigation(): AppNavigation | null {
    const navigation = (window as unknown as NavigationWindow).navigation;
    return navigation ?? null;
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
