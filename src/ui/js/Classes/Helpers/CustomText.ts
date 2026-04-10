export class CustomText {
    static escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    static renderToHtml(text: string): string {
        if (!text) {
            return "";
        }

        const httpPattern = /(https?:\/\/[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/[^\s<>"']*)?)/gmi;
        const atMentionPattern = /@(\w+)/gmi;

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
                result += `<a href="${escaped}" target='_blank' class='inlineLink'>${escaped}</a>`;
            } else {
                const escaped = CustomText.escapeHtml(m.username);
                result += `<a href="/profile/${escaped}" target='_blank' class='inlineLink'>@${escaped}</a>`;
            }
            lastIndex = m.end;
        }
        result += CustomText.escapeHtml(text.substring(lastIndex));

        return result;
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