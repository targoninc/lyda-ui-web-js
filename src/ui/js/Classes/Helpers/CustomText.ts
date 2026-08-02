import {navigate} from "../../Routing/Router.ts";

export class CustomText {
    static escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    static renderToHtml(text: string): HTMLElement {
        const container = document.createElement("span");
        if (!text) {
            return container;
        }

        const httpPattern = /(https?:\/\/[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/[^\s<>"']*)?)/gmi;
        const atMentionPattern = /@([\w-]+)/gmi;

        // Collect URL matches from raw text
        const urlMatches: { start: number; end: number; url: string }[] = [];
        let match;
        while ((match = httpPattern.exec(text)) !== null) {
            urlMatches.push({ start: match.index, end: match.index + match[0].length, url: match[0] });
        }

        // Collect @mention matches from raw text, skipping those inside URLs
        const mentionMatches: { start: number; end: number; username: string }[] = [];
        while ((match = atMentionPattern.exec(text)) !== null) {
            const inUrl = urlMatches.some(u => match!.index >= u.start && match!.index < u.end);
            if (!inUrl) {
                mentionMatches.push({ start: match.index, end: match.index + match[0].length, username: match[1] });
            }
        }

        // Merge and sort by position
        const allMatches = [
            ...urlMatches.map(m => ({ ...m, type: "url" as const })),
            ...mentionMatches.map(m => ({ ...m, type: "mention" as const })),
        ].sort((a, b) => a.start - b.start);

        let result = "";
        let lastIndex = 0;
        for (const m of allMatches) {
            result += CustomText.escapeHtml(text.substring(lastIndex, m.start));
            if (m.type === "url") {
                const escaped = CustomText.escapeHtml(m.url);
                const appPath = CustomText.entityPath(m.url);
                if (appPath) {
                    const escapedPath = CustomText.escapeHtml(appPath);
                    result += `<a href="${escapedPath}" data-app-route="${escapedPath}" class='inlineLink'>${escaped}</a>`;
                } else {
                    result += `<a href="${escaped}" target='_blank' rel='noopener noreferrer' class='inlineLink'>${escaped}</a>`;
                }
            } else {
                const escaped = CustomText.escapeHtml(m.username);
                const appPath = `/profile/${encodeURIComponent(m.username)}`;
                result += `<a href="${appPath}" data-app-route="${appPath}" class='inlineLink'>@${escaped}</a>`;
            }
            lastIndex = m.end;
        }
        result += CustomText.escapeHtml(text.substring(lastIndex));
        container.innerHTML = result;

        container.querySelectorAll<HTMLAnchorElement>("a[data-app-route]").forEach(link => {
            link.addEventListener("click", event => {
                if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                    return;
                }

                event.preventDefault();
                navigate(link.dataset.appRoute ?? link.getAttribute("href") ?? "/");
            });
        });

        return container;
    }

    private static entityPath(value: string): string | null {
        let url: URL;
        try {
            url = new URL(value);
        } catch {
            return null;
        }

        if (url.origin !== window.location.origin && !["lyda.app", "www.lyda.app"].includes(url.hostname)) {
            return null;
        }

        const match = url.pathname.match(/^\/(profile|user|track|album|playlist)(\/.*)?$/);
        if (!match) {
            return null;
        }

        return `${url.pathname}${url.search}${url.hash}`;
    }
}

export function truncateText(text: string, length: number): string {
    if (!text) {
        return "";
    }
    return text.length > length ? text.substring(0, length - 3) + "..." : text;
}

export function anonymize(text?: string|null, startLength: number = 2, endLength: number = 2): string {
    if (!text) {
        return "";
    }

    return text.substring(0, startLength) + "***" + text.substring(text.length - endLength - 1, text.length);
}
