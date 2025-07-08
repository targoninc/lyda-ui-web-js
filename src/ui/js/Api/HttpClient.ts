import { notify } from "../Classes/Ui.ts";
import { NotificationType } from "../Enums/NotificationType.ts";

export interface ApiResponse<T> {
    code: number;
    data: T | { error?: string };
}

export class HttpClient {
    static buildParams(params: any): string {
        if (Object.keys(params).length === 0) {
            return "";
        }
        let paramStr = "?";
        for (const key of Object.keys(params)) {
            paramStr += key + "=" + params[key] + "&";
        }
        return paramStr.substring(0, paramStr.length - 1);
    }

    static async getDataFromHttpResponse<T = any>(res: Response): Promise<T> {
        let data = await res.text();
        if (data.startsWith("{") || data.startsWith("[")) {
            try {
                data = JSON.parse(data);
            } catch (e: any) {
                console.warn("Error while parsing JSON", e);
            }
        }

        return data as T;
    }

    static async getAsync<T>(
        url: string,
        params: object = {},
        authorizationHeaders = {}
    ): Promise<ApiResponse<T>> {
        if (!url) {
            throw new Error("url is required");
        }
        const res = await fetch(url + HttpClient.buildParams(params), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...authorizationHeaders,
            },
            credentials: "include",
        });

        if (res.status === 429) {
            notify("Too many requests, please try again in 15 minutes.", NotificationType.error);
            return {
                code: 429,
                data: {
                    error: "Too many requests, please try again in 15 minutes.",
                },
            };
        }

        return {
            code: res.status,
            data: await HttpClient.getDataFromHttpResponse(res),
        };
    }

    static async postRawAsync(url: string, body: any = {}, authorizationHeaders = {}) {
        const headers: Record<string, string> =
            body.constructor === FormData
                ? {}
                : {
                      "Content-Type": "application/json",
                  };
        const res = await fetch(url, {
            method: "POST",
            mode: "cors",
            headers: {
                ...headers,
                ...authorizationHeaders,
            },
            credentials: "include",
            body,
        });

        if (res.status === 429) {
            notify("Too many requests, please try again in 15 minutes.", NotificationType.error);
            return {
                code: 429,
                data: {
                    error: "Too many requests, please try again in 15 minutes.",
                },
            };
        }

        return {
            code: res.status,
            data: await HttpClient.getDataFromHttpResponse(res),
        };
    }
}
