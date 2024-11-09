export interface ApiResponse<T> {
    code: number;
    data: T & { error?: string };
}

export class Api {
    /**
     * @param {Object} params - The params to build
     * @returns {string} - The params as a string
     */
    static buildParams(params) {
        if (Object.keys(params).length === 0) {
            return "";
        }
        let paramStr = "?";
        for (let key of Object.keys(params)) {
            paramStr += key + "=" + params[key] + "&";
        }
        return paramStr.substring(0, paramStr.length - 1);
    }

    /**
     * @param {Response} res - The response to get data from
     * @returns {Promise<*>} - The data from the response, parsed if possible
     */
    static async getDataFromHttpResponse(res) {
        let data = await res.text();
        try {
            data = JSON.parse(data);
        } catch (e) {
            // Ignore
        }
        return data;
    }

    /**
     * @param {string} url - The url to post to
     * @param {Object} params - The params to post
     * @param authorizationHeaders
     * @returns {Promise<{code: number, data: any}>} - The response code and data
     */
    static async getAsync(url, params = {}, authorizationHeaders = {}) {
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
        return {
            code: res.status,
            data: await Api.getDataFromHttpResponse(res)
        };
    }

    static async postAsync<T>(url: string, body: any = {}, authorizationHeaders: any = {}): Promise<ApiResponse<T>> {
        return await Api.postRawAsync(url, JSON.stringify(body), authorizationHeaders);
    }

    static async postRawAsync(url: string, body: any = {}, authorizationHeaders = {}) {
        const headers = {
            "Content-Type": "application/json",
        };
        if (body.constructor === FormData) {
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
        return {
            code: res.status,
            data: await Api.getDataFromHttpResponse(res)
        };
    }
}