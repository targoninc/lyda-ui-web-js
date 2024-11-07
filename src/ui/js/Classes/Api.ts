import {Config} from "./Config.ts";

export interface ApiResponse<T> {
    code: number;
    data: T & { error?: string };
}

export class ApiRoutes {
    static base = Config.apiBaseUrl;
    private static auth = ApiRoutes.base + "/auth";
    static isLoggedIn = ApiRoutes.auth + "/isLoggedIn";
    private static audit = ApiRoutes.base + "/audit";
    static logs = ApiRoutes.audit + "/logs";
    static actionLogs = ApiRoutes.audit + "/actionLogs";
    private static user = ApiRoutes.base + "/user";
    static getUser = ApiRoutes.user + "/get";
    static userSettings = ApiRoutes.user + "/settings";
    static userPermissions = ApiRoutes.user + "/permissions";
    static randomUser = ApiRoutes.user + "/random";
    static userExists = ApiRoutes.user + "/exists";
    private static userActions = ApiRoutes.user + "/actions";
    static followUser = ApiRoutes.userActions + "/follow";
    static unfollowUser = ApiRoutes.userActions + "/unfollow";
    static verifyUser = ApiRoutes.userActions + "/verify";
    static unverifyUser = ApiRoutes.userActions + "/unverify";
    static requestVerification = ApiRoutes.userActions + "/requestVerification";
    static login = ApiRoutes.userActions + "/login";
    static logout = ApiRoutes.userActions + "/logout";
    static register = ApiRoutes.userActions + "/register";
    static mfaRequest = ApiRoutes.userActions + "/mfa-request";
    static updateUserSetting = ApiRoutes.userActions + "/update-setting";
    static changePassword = ApiRoutes.userActions + "/change-password";
    static requestPasswordReset = ApiRoutes.userActions + "/request-password-reset";
    static resetPassword = ApiRoutes.userActions + "/reset-password";
    static updateUser = ApiRoutes.userActions + "/update";
    private static media = ApiRoutes.base + "/media";
    static uploadMedia = ApiRoutes.media + "/upload";
    static deleteMedia = ApiRoutes.media + "/delete";
    private static notifications = ApiRoutes.base + "/notifications";
    static getAllNotifications = ApiRoutes.notifications + "/get";
    static markAllNotificationsAsRead = ApiRoutes.notifications + "/actions/markAllAsRead";
    static listGenres = ApiRoutes.base + "/genres/list";
}

export class Api {
    static get endpoints() {
        const endpoints = {
            base: Config.apiBaseUrl,
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