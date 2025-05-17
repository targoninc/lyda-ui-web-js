import {NotificationType} from "../EnumsShared/NotificationType.ts";
import {notify} from "../Classes/Ui.ts";
import {ApiRoutes} from "./ApiRoutes.ts";

export interface ApiResponse<T> {
    code: number;
    data: T & { error?: string };
}

export class Api {
    static buildParams(params: any): string {
        if (Object.keys(params).length === 0) {
            return "";
        }
        let paramStr = "?";
        for (let key of Object.keys(params)) {
            paramStr += key + "=" + params[key] + "&";
        }
        return paramStr.substring(0, paramStr.length - 1);
    }

    static async getDataFromHttpResponse<T = any>(res: Response): Promise<T> {
        let data = await res.text();
        try {
            data = JSON.parse(data);
        } catch (e) {
            // Ignore
        }
        return data as T;
    }

    static async getAsync<T>(url: string, params: object = {}, authorizationHeaders = {}): Promise<ApiResponse<T>> {
        if (!url) {
            throw new Error("url is required");
        }
        const res = await fetch(url + Api.buildParams(params), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...authorizationHeaders
            },
            credentials: "include",
        });

        if (res.status === 429) {
            notify("Too many requests, please try again in 15 minutes.", NotificationType.error);
            return {
                code: 429,
                data: {
                    error: "Too many requests, please try again in 15 minutes."
                }
            };
        }

        return {
            code: res.status,
            data: await Api.getDataFromHttpResponse(res)
        };
    }

    static async postAsync<T = string>(url: string, body: any = {}, authorizationHeaders: any = {}): Promise<ApiResponse<T>> {
        return await Api.postRawAsync(url, JSON.stringify(body), authorizationHeaders);
    }

    static async postRawAsync(url: string, body: any = {}, authorizationHeaders = {}) {
        const headers = {
            "Content-Type": "application/json",
        };
        if (body.constructor === FormData) {
            // @ts-ignore
            delete headers["Content-Type"];
        }
        const res = await fetch(url, {
            method: "POST",
            mode: "cors",
            headers: {
                ...headers,
                ...authorizationHeaders
            },
            credentials: "include",
            body
        });

        if (res.status === 429) {
            notify("Too many requests, please try again in 15 minutes.", NotificationType.error);
            return {
                code: 429,
                data: {
                    error: "Too many requests, please try again in 15 minutes."
                }
            };
        }

        return {
            code: res.status,
            data: await Api.getDataFromHttpResponse(res)
        };
    }
}