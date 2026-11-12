import {ClientError} from "@targoninc/lyda-shared/src/Models/db/lyda/ClientError";
import {Api} from "../../Api/Api.ts";
import {currentUser} from "../../state.ts";

const maxBreadcrumbs = 20;
const breadcrumbs: string[] = [];
const recentErrors = new Map<string, number>();
const duplicateWindowMs = 5000;
let previousPageUrl = document.referrer || null;
let currentPageUrl = window.location.href;

function pageName(): string | null {
    return document.querySelector(".page-container")?.getAttribute("page") ?? null;
}

function describeError(error: unknown): Record<string, unknown> {
    if (error === null || error === undefined) {
        return {};
    }
    if (typeof error === "string") {
        return {message: error};
    }
    if (typeof error === "object") {
        const value = error as {
            name?: unknown;
            message?: unknown;
            stack?: unknown;
            cause?: unknown;
        };
        const description: Record<string, unknown> = {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
        if (value.cause !== undefined) {
            description.cause = describeError(value.cause);
        }
        if (!description.name && !description.message && !description.stack) {
            try {
                description.value = JSON.parse(JSON.stringify(error));
            } catch {
                description.value = String(error);
            }
        }
        return description;
    }
    return {value: String(error)};
}

function errorMessage(error: unknown): string {
    if (typeof error === "string") {
        return error;
    }
    if (error && typeof error === "object" && "message" in error) {
        return String((error as {message?: unknown}).message ?? "Unknown error");
    }
    return String(error);
}

export function recordClientBreadcrumb(message: string): void {
    const url = window.location.href;
    if (url !== currentPageUrl) {
        previousPageUrl = currentPageUrl;
        currentPageUrl = url;
    }
    breadcrumbs.push(`${new Date().toISOString()} ${message}`);
    if (breadcrumbs.length > maxBreadcrumbs) {
        breadcrumbs.shift();
    }
}

export async function reportClientError(error: unknown, context: Record<string, unknown> = {}): Promise<void> {
    const message = errorMessage(error);
    const details = {
        ...describeError(error),
        ...context,
        pageUrl: window.location.href,
        page: pageName(),
        previousPageUrl,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent,
        language: navigator.language,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        breadcrumbs: [...breadcrumbs],
    };

    console.error("[lyda] client error", message, details, error);

    if (!currentUser.value) {
        return;
    }

    const signature = `${message}|${String(context.sourceUrl ?? "")}|${String(context.line ?? "")}|${String(context.column ?? "")}`;
    const now = Date.now();
    const lastReported = recentErrors.get(signature);
    if (lastReported && now - lastReported < duplicateWindowMs) {
        return;
    }
    recentErrors.set(signature, now);
    if (recentErrors.size > 100) {
        const oldest = [...recentErrors.entries()].sort((a, b) => a[1] - b[1])[0];
        if (oldest) {
            recentErrors.delete(oldest[0]);
        }
    }

    const line = typeof context.line === "number" ? context.line : undefined;
    const column = typeof context.column === "number" ? context.column : undefined;
    const sourceUrl = typeof context.sourceUrl === "string" && context.sourceUrl.length > 0
        ? context.sourceUrl
        : window.location.href;

    try {
        await Api.trackClientError({
            message,
            url: sourceUrl,
            line,
            column,
            error: details,
        } as unknown as ClientError);
    } catch (reportingError) {
        console.error("[lyda] failed to report client error", reportingError);
    }
}

export function initializeGlobalErrorHandler() {
    const handleErrorEvent = (event: Event) => {
        if (event instanceof ErrorEvent) {
            void reportClientError(event.error ?? event.message, {
                kind: "error",
                sourceUrl: event.filename || undefined,
                line: event.lineno || undefined,
                column: event.colno || undefined,
                crossOrigin: !event.error,
            });
            return;
        }

        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }
        if (!["SCRIPT", "LINK"].includes(target.tagName)) {
            return;
        }

        const sourceUrl = target instanceof HTMLScriptElement
            ? target.src
            : target instanceof HTMLLinkElement
                ? target.href
                : undefined;
        void reportClientError(`Failed to load ${target.tagName.toLowerCase()}`, {
            kind: "resource",
            sourceUrl,
            tagName: target.tagName,
        });
    };
    window.addEventListener("error", handleErrorEvent, true);

    window.addEventListener("unhandledrejection", event => {
        void reportClientError(event.reason, {
            kind: "unhandledrejection",
        });
    });

    recordClientBreadcrumb(`page-load ${currentPageUrl}`);
    window.addEventListener("popstate", () => {
        previousPageUrl = currentPageUrl;
        currentPageUrl = window.location.href;
        recordClientBreadcrumb(`popstate ${currentPageUrl}`);
    });
    const navigation = (window as unknown as {navigation?: Navigation}).navigation;
    navigation?.addEventListener("navigate", event => {
        previousPageUrl = currentPageUrl;
        currentPageUrl = event.destination.url;
        recordClientBreadcrumb(`navigate ${currentPageUrl}`);
    });
}
