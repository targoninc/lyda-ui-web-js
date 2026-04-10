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

        const escaped = CustomText.escapeHtml(text);
        const atMentionPattern = /(?<!<a[^>]*>)@(\w+)/gmi;
        const httpPattern = /(https?:\/\/[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gmi;
        let replacedText = escaped.replace(httpPattern, "<a href=\"$1\" target='_blank' class='inlineLink'>$1</a>");
        replacedText = replacedText.replace(atMentionPattern, "<a href=\"/profile/$1\" target='_blank' class='inlineLink'>@$1</a>");
        return replacedText;
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