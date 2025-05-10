export class CustomText {
    static renderToHtml(text: string): string {
        if (!text) {
            return "";
        }

        let atMentionPattern = /(?<!<a[^>]*>)@(\w+)/gmi;
        let httpPattern = /(http(s)?:\/\/[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gmi;
        let replacedText = text.replace(httpPattern, "<a href=\"$1\" target='_blank' class='inlineLink'>$1</a>");
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

export function anonymize(text: string, startLength: number = 2, endLength: number = 2): string {
    if (!text) {
        return "";
    }

    return text.substring(0, startLength) + "***" + text.substring(text.length - endLength - 1, text.length);
}