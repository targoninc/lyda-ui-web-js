import { notify } from "../Classes/Ui.ts";
import { NotificationType } from "../Enums/NotificationType.ts";

const refetch = async <T>(
    method: "POST" | "GET",
    url: string,
    headers: Record<string, string>,
    body?: any
): Promise<T | null> => {
    const res = await fetch(url, {
        method,
        mode: "cors",
        credentials: "include",
        headers:
            body instanceof FormData ? headers : { "Content-Type": "application/json", ...headers },
        body: body instanceof FormData ? body : JSON.stringify(body),
    });

    if (url.includes("/audio?")) {
        return await res.blob() as T;
    }

    const text = await res.text();
    if (!res.ok) {
        const noErrorCodes = [401, 404];
        if (noErrorCodes.includes(res.status)) {
            return null;
        }

        console.error(text);
        notify(
            `API call failed: ${text.substring(0, 100) + (text.length > 100) ? "..." : ""}`,
            NotificationType.error
        );
        throw new Error(text);
    }

    try {
        return JSON.parse(text) as T;
    } catch (e: any) {
        // ignore
        return null;
    }
};

function getGetUrl(urlIn: string, params: Record<string, string>) {
    const url = new URL(urlIn);

    for (const key in params) {
        if (params[key] !== undefined && params[key] !== null) {
            url.searchParams.set(key, params[key].toString());
        }
    }

    return url.href;
}

export const get = <T>(url: string, params: Record<string, any> = {}, headers: Record<string, string> = {}) =>
    refetch<T>("GET", getGetUrl(url, params), headers);

export const post = <T>(url: string, body: any = {}, headers: Record<string, string> = {}) =>
    refetch<T>("POST", url, headers, body);

export const postRaw = <T>(url: string, body: any, headers: Record<string, string> = {}) =>
    refetch<T>("POST", url, headers, body);
