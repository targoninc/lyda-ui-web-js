import {Config} from "./Config.ts";

export interface ApiResponse<T> {
    code: number;
    data: T & { error?: string };
}

export class Api {
    static get endpoints() {
        const endpoints = {
            base: Config.apiBaseUrl,
            auth: {
                isLoggedIn: "isLoggedIn"
            },
            audit: {
                logs: "logs",
                actionLogs: "actionLogs",
            },
            user: {
                get: "get",
                settings: "settings",
                permissions: "permissions",
                random: "random",
                userExists: "exists",
                actions: {
                    follow: "follow",
                    unfollow: "unfollow",
                    avatar: {
                        upload: "upload",
                        delete: "delete",
                    },
                    banner: {
                        upload: "upload",
                        delete: "delete",
                    },
                    verify: "verify",
                    unverify: "unverify",
                    requestVerification: "requestVerification",
                    login: "login",
                    logout: "logout",
                    register: "register",
                    mfaRequest: "mfa-request",
                    updateSetting: "update-setting",
                },
                set: {
                    property: "property",
                    paypalMail: "paypalMail",
                },
                remove: {
                    paypalMail: "paypalMail",
                }
            },
            tracks: {
                byId: "byId",
                byUserId: "byUserId",
                audio: "audio",
                collabTypes: "collabTypes",
                unapprovedCollabs: "unapprovedCollabs",
                actions: {
                    new: "new",
                    like: "like",
                    unlike: "unlike",
                    repost: "repost",
                    unrepost: "unrepost",
                    uploadCover: "changeCover",
                    regenerateSecret: "regenerateSecret",
                    delete: "delete",
                    update: "update",
                    updateFull: "updateFull",
                    savePlay: "savePlay",
                    removeCollaborator: "removeCollaborator",
                    addCollaborator: "addCollaborator",
                    approveCollab: "approveCollab",
                    denyCollab: "denyCollab",
                },
                feeds: {
                    following: "following",
                    explore: "explore",
                    autoQueue: "autoQueue",
                }
            },
            genres: {
                list: "list",
            },
            albums: {
                byId: "byId",
                byUserId: "byUserId",
                actions: {
                    new: "new",
                    delete: "delete",
                    addTrack: "addTrack",
                    uploadCover: "changeCover",
                    removeTrack: "removeTrack",
                    reorderTracks: "reorderTracks",
                    like: "like",
                    unlike: "unlike",
                }
            },
            notifications: {
                get: "get",
                actions: {
                    markAllAsRead: "markAllAsRead",
                }
            },
            reposts: {
                byUserId: "byUserId"
            },
            playlists: {
                byId: "byId",
                byUserId: "byUserId",
                actions: {
                    new: "new",
                    delete: "delete",
                    addTrack: "addTrack",
                    addAlbum: "addAlbum",
                    uploadCover: "changeCover",
                    removeTrack: "removeTrack",
                    reorderTracks: "reorderTracks",
                    like: "like",
                    unlike: "unlike",
                }
            },
            comments: {
                actions: {
                    new: "new",
                    delete: "delete",
                    hide: "hide",
                    unhide: "unhide",
                    markSafe: "markSafe",
                    markUnsafe: "markUnsafe",
                },
                potentiallyHarmful: "potentiallyHarmful",
            },
            statistics: {
                playCountByTrack: "playCountByTrack",
                playCountByMonth: "playCountByMonth",
                likesByTrack: "likesByTrack",
                royaltiesByMonth: "royaltiesByMonth",
                royaltiesByTrack: "royaltiesByTrack",
                royaltyInfo: "royaltyInfo",
            },
            royalties: {
                requestPayment: "requestPayment",
                calculateRoyalties: "calculateRoyalties",
            },
            search: "search",
            library: {
                get: "get",
            },
            subscriptions: {
                options: "options",
                actions: {
                    create: "create",
                    delete: "delete",
                }
            }
        };
        return this.resolveEndpoints(endpoints, endpoints.base + "/");
    }

    static resolveEndpoints(endpoints, base) {
        for (let key in endpoints) {
            if (endpoints[key].constructor === Object) {
                endpoints[key] = this.resolveEndpoints(endpoints[key], base + key + "/");
                continue;
            }
            if (key !== "base") {
                endpoints[key] = base + endpoints[key];
            }
        }
        return endpoints;
    }

    websockets = {
        base: "wss://ws.lyda.app/",
        uploadAudio: "uploadAudio",
    };

    constructor() {
        for (let endpoint in Api.endpoints) {
            if (endpoint !== "base") {
                Api.endpoints[endpoint] = Api.endpoints.base + Api.endpoints[endpoint];
            }
        }
        for (let endpoint in this.websockets) {
            if (endpoint !== "base") {
                this.websockets[endpoint] = this.websockets.base + this.websockets[endpoint];
            }
        }
    }

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

    /**
     * @param {string} endpoint - The endpoint to connect to
     * @param {Function} onMessage - The function to call when a message is received
     * @param {Function} onError - The function to call when an error occurs
     * @param {Function} onClose - The function to call when the connection is closed
     * @param {Function} onOpen - The function to call when the connection is opened
     * @returns {WebSocket} - The websocket connection
     */
    connectToWebsocket = (endpoint, onMessage, onError, onClose, onOpen) => {
        const socket = new WebSocket(endpoint);
        socket.onmessage = onMessage;
        socket.onerror = onError;
        socket.onclose = onClose;
        socket.onopen = onOpen;
        return socket;
    };
}