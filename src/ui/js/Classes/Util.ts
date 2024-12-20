import {notify} from "./Ui.ts";
import {Images} from "../Enums/Images.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {Api, ApiResponse} from "../Api/Api.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {AnyElement} from "../../fjsc/src/f2.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {MediaFileType} from "../Enums/MediaFileType.ts";
import {User} from "../Models/DbModels/User.ts";
import {currentUser, dragging} from "../state.ts";
import {Signal} from "../../fjsc/src/signals.ts";

export class Util {
    static capitalizeFirstLetter(string: string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    static getUrlParameter(name: string) {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        return urlParams.get(name);
    }

    static showButtonLoader(e: Event) {
        try {
            target(e).querySelector(".loader")?.classList.remove("hidden");
            target(e).querySelector("span")?.classList.add("hidden");
        } catch (e) { /* empty */ }
    }

    static hideButtonLoader(t: HTMLInputElement) {
        try { 
            t.querySelector(".loader")?.classList.add("hidden");
            t.querySelector("span")?.classList.remove("hidden");
        } catch (e) { /* empty */ }
    }

    static closeAllDetails() {
        const summaries = document.querySelectorAll("details");
        summaries.forEach(summary => {
            summary.removeAttribute("open");
        });
    }

    static openAllDetails() {
        const summaries = document.querySelectorAll("details");
        summaries.forEach(summary => {
            summary.setAttribute("open", "");
        });
    }

    static toHexString(id: number|string) {
        if (id === null || id === undefined) {
            return "";
        }
        if (id.constructor === String) {
            id = parseInt(id);
        }
        // noinspection JSCheckFunctionSignatures
        return id.toString(16); // This accepts a parameter, radix, which is an integer between 2 and 36 that represents the base of the number in the string.
    }

    static initializeDraggable(draggable: HTMLElement) {
        dragging.value = false;
        let thisIsDragged = false;
        let offset = { x: 0, y: 0 };
        draggable.addEventListener("mousedown", function(e) {
            if (dragging.value && !thisIsDragged) {
                return;
            }
            dragging.value = true;
            thisIsDragged = true;
            offset = {
                x: draggable.offsetLeft - e.clientX,
                y: draggable.offsetTop - e.clientY
            };
        }, true);

        document.addEventListener("mouseup", function() {
            dragging.value = false;
            thisIsDragged = false;
        }, true);

        document.addEventListener("mousemove", function(event) {
            event.preventDefault();
            if (dragging.value && thisIsDragged) {
                draggable.style.left = (event.clientX + offset.x) + "px";
                draggable.style.top = (event.clientY + offset.y) + "px";
                window.getSelection()?.removeAllRanges();
            }
        }, true);
    }

    static async getAvatarFromUserIdAsync(id: number|null) {
        if (id === null) {
            return Images.DEFAULT_AVATAR;
        }
        const url = ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${MediaFileType.userAvatar}&t=${Date.now()}`;
        return await Util.getFileOrBackupAsync(url, Images.DEFAULT_AVATAR);
    }

    static async getBannerFromUserIdAsync(id: number|null) {
        if (id === null) {
            return Images.DEFAULT_BANNER;
        }
        const url = ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${MediaFileType.userBanner}&t=${Date.now()}`;
        return await Util.getFileOrBackupAsync(url, Images.DEFAULT_BANNER);
    }

    static async getCoverFileFromTrackIdAsync(id: number, user_id: number|null = null) {
        const url = ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${MediaFileType.trackCover}&t=${Date.now()}`;
        return await Util.getFileOrBackupAsync(url, Util.getAvatarFromUserIdAsync, user_id);
    }

    static async getCoverFileFromAlbumIdAsync(id: number, user_id: number|null = null) {
        const url = ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${MediaFileType.albumCover}&t=${Date.now()}`;
        return await Util.getFileOrBackupAsync(url, Util.getAvatarFromUserIdAsync, user_id);
    }

    static async getCoverFileFromPlaylistIdAsync(id: number, user_id: number|null = null) {
        const url = ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${MediaFileType.playlistCover}&t=${Date.now()}`;
        return await Util.getFileOrBackupAsync(url, Util.getAvatarFromUserIdAsync, user_id);
    }

    static async getFileOrBackupAsync(url: string, backupUrl: string|Function, user_id: number|null = null) {
        const res = await fetch(url);
        if (res.status === 200) {
            return url;
        }
        if (backupUrl.constructor !== String) {
            backupUrl = await (backupUrl as Function)(user_id);
        }
        return backupUrl as string;
    }

    static async copyToClipboard(text: string) {
        await navigator.clipboard.writeText(text);
        notify("Copied to clipboard", "success");
    }

    static async fileExists(url: string) {
        let response = await fetch(url);
        return response.status === 200;
    }

    static async updateImage(newSrc: string, oldSrc: string) {
        const fileExists = await this.fileExists(newSrc);
        if (!fileExists) {
            setTimeout(() => {
                this.updateImage(newSrc, oldSrc);
            }, 1000);
        } else {
            const images = document.querySelectorAll("img");
            images.forEach((i) => {
                if (i.src === oldSrc) {
                    i.src = newSrc;
                }
            });
        }
    }

    static getTrackIdFromEvent(e: Event) {
        try {
            return target(e).getAttribute("track_id");
        } catch (e) {
            console.error(e);
            return "";
        }
    }

    static getAlbumIdFromEvent(e: Event) {
        try {
            return target(e).getAttribute("album_id");
        } catch (e) {
            console.error(e);
            return "";
        }
    }

    static getPlaylistIdFromEvent(e: Event) {
        try {
            return target(e).getAttribute("playlist_id");
        } catch (e) {
            console.error(e);
            return "";
        }
    }

    static toggleClass(e: HTMLElement|null, className: string, baseClass: string|null = null) {
        if (e === null) {
            return;
        }
        if (e.classList.contains(className)) {
            if (baseClass !== null) {
                const list = document.querySelectorAll("." + baseClass);
                list.forEach((e) => {
                    e.classList.add(className);
                });
            }
            e.classList.remove(className);
        } else {
            e.classList.add(className);
        }
    }

    static formatDate(date: string|Date) {
        if (date.constructor === String) {
            date = new Date(date);
        }
        return (date as Date).toLocaleDateString();
    }

    static getDateForPicker(date: string|Date) {
        if (date.constructor === String) {
            date = new Date(date);
        }
        return (date as Date).toISOString().split("T")[0];
    }

    static hideElementIfCondition(conditionFunc: Function, className: string, e: any) {
        if (conditionFunc(e)) {
            const target = e.target.parentElement.querySelector("." + className);
            if (target === null) {
                return;
            }
            if (target.classList.contains("hidden")) {
                return;
            }
            target.classList.add("hidden");
        } else {
            document.addEventListener("click", e => Util.hideElementIfCondition(conditionFunc, className, e), { once: true });
        }
    }

    static async getUserAsync(id: number|null = null, allowCache = true) {
        if (!id) {
            if (allowCache) {
                const userData = currentUser.value;
                if (userData !== null) {
                    return userData;
                }
            }
            return await Util.getUser();
        } else {
            if (allowCache) {
                // TODO: Implement caching for user by id
            }
            const res = await Api.getAsync<User>(ApiRoutes.getUser, { id: nullIfEmpty(id) });
            if (res.code === 401) {
                return null;
            }
            if (res.code === 500) {
                notify("An error occurred while fetching the user", "error");
                return null;
            }
            return Util.mapNullToEmptyString(res.data);
        }
    }

    static arrayPropertyMatchesUser(array: any[], property: any, user: User) {
        if (!array || !property || !user) {
            return false;
        }
        return array.some((e) => e[property] === user.id);
    }

    static async getUserByNameAsync(name: string) {
        const res = await Api.getAsync(ApiRoutes.getUser, { name: nullIfEmpty(name) });
        if (res.code === 401) {
            return null;
        }
        if (res.code === 500) {
            notify("An error occurred while fetching the user", "error");
            return null;
        }
        return Util.mapNullToEmptyString(res.data);
    }

    static initializeModalRemove(modalContainer: AnyElement) {
        setTimeout(() => {
            document.addEventListener("click", e => {
                const foundModal = document.querySelector(".modal");
                if (foundModal && !foundModal.contains(target(e))) {
                    Util.removeModal(modalContainer);
                }
            }, {once: true});
        }, 100);
    }

    static removeModal(modal: AnyElement|null = null) {
        if (modal === null || !(modal instanceof HTMLElement)) {
            modal = document.querySelector(".modal-container");
        }
        if (modal) {
            modal.remove();
        }
    }

    static parseCachedUser(rawCachedUser: string|User|null) {
        let userData;
        try {
            userData = JSON.parse(rawCachedUser as string);
        } catch(e) {
            userData = rawCachedUser;
        }
        return userData;
    }

    static mapNullToEmptyString(obj: any) {
        for (const key in obj) {
            if (obj[key] === null) {
                obj[key] = "";
            }
        }
        return obj;
    }

    static async getUser() {
        let userData;
        const res = await Api.getAsync<User>(ApiRoutes.getUser);
        if (res.code === 401) {
            return null;
        }
        userData = res.data;
        if (userData === null) {
            return null;
        }
        currentUser.value = Util.mapNullToEmptyString(userData);
        return currentUser.value;
    }

    static mergeObjects(obj1: any, obj2: any) {
        for (const key in obj2) {
            obj1[key] = obj2[key];
        }
        return obj1;
    }

    static mergeObjectList(objList: any) {
        let obj = {};
        objList.forEach((o: any) => {
            obj = Util.mergeObjects(obj, o);
        });
        return obj;
    }

    /**
     * Uses a timeout to wait for the DOM to be ready before nesting the comments
     * If a comment has a parent_id, it will be nested under the parent comment if that exists
     */
    static nestCommentElementsByParents() {
        setTimeout(() => {
            const commentList = document.querySelectorAll(".comment-list");
            commentList.forEach((c) => {
                Util.nestCommentElementsByCommentList(c);
            });
        }, 100);
    }

    /**
     * Nest comments by their parent_id recursively
     */
    static nestCommentElementsByCommentList(commentList: HTMLElement) {
        const comments = commentList.querySelectorAll(".comment-in-list");
        const commentMap = {};
        comments.forEach((c) => {
            const id = c.getAttribute("id");
            let parentId = c.getAttribute("parent_id");
            if (parentId === "null") {
                parentId = 0;
            }
            if (commentMap[parentId] === undefined) {
                commentMap[parentId] = [];
            }
            commentMap[parentId].push(id);
        });
        const nestComments = (parentId) => {
            if (commentMap[parentId] === undefined) {
                return;
            }
            commentMap[parentId].forEach((id) => {
                const comment = document.querySelector(".comment-in-list[id='" + id + "']");
                let parentComment = document.querySelector(".comment-in-list[id='" + parentId + "']");
                let removeOriginal = false;
                if (parentComment === null) {
                    parentComment = commentList;
                    removeOriginal = true;
                } else {
                    parentComment = parentComment.querySelector(".comment-children");
                }
                if (removeOriginal) {
                    comment.remove();
                }
                parentComment.appendChild(comment);
                nestComments(id);
            });
        };
        nestComments(0);
    }

    static getUserIdFromEvent(e: Event) {
        const userId = target(e).getAttribute("user_id");
        if (userId === null) {
            return "";
        }
        return userId;
    }

    static includeStylesheet(css: string) {
        const links = document.head.querySelectorAll("link[href='" + css + "']");
        if (links !== null && links.length > 0) {
            return;
        }
        const link = document.createElement("link");
        link.setAttribute("rel", "stylesheet");
        link.setAttribute("href", css);
        document.head.appendChild(link);
    }

    static removeStylesheet(css: string) {
        const links = document.head.querySelectorAll("link[href='" + css + "']");
        if (links !== null) {
            links.forEach((l) => {
                l.remove();
            });
        }
    }

    static isLoggedIn() {
        return currentUser.value !== null;
    }

    static downloadFile(fileName: string, content: string) {
        const link = document.createElement("a");
        link.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
        link.download = fileName;
        link.click();
    }
}

export function nullIfEmpty(value: any) {
    if (value === undefined) {
        return null;
    }

    return value;
}

export function finalizeLogin(step: Signal<string>, user: User) {
    LydaCache.set("user", new CacheItem(JSON.stringify(user)));
    step.value = "complete";

    let referrer = document.referrer;
    if (referrer !== "" && !referrer.includes("login")) {
        //window.location.href = referrer;
    } else {
        //window.location.href = "/home";
    }
}

export function getUserSettingValue<T>(user: User, key: string) {
    const val = user.settings?.find(s => s.key === key)?.value;
    if (val === "true") return true as T;
    if (val === "false") return false as T;
    return val as T;
}

export function userHasSettingValue(user: User, key: string, value: string) {
    return getUserSettingValue(user, key) === value;
}

export function updateUserSetting(user: User, key: string, value: string) {
    return user.settings?.map(s => {
        if (s.key === key) {
            s.value = value;
        }
        return s;
    })
}

export function target(e: Event) {
    return e.target as HTMLInputElement;
}

export function getErrorMessage(res: ApiResponse<any>) {
    if (res.data?.error) {
        return res.data.error;
    }

    switch (res.code) {
        case 400:
            return "Invalid request";
        case 401:
            return "Not logged in";
        case 403:
            return "Missing permissions";
        case 404:
            return "Not found";
        case 500:
            return "Server error";
        default:
            return "Unknown error";
    }
}