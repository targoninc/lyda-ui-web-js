import {notify} from "./Ui.ts";
import {Images} from "../Enums/Images.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {Api, ApiResponse} from "../Api/Api.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {AnyElement} from "../../fjsc/src/f2.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {MediaFileType} from "../Enums/MediaFileType.ts";
import {User} from "../Models/DbModels/lyda/User.ts";
import {currentUser, dragging} from "../state.ts";
import {compute, Signal} from "../../fjsc/src/signals.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {Comment} from "../Models/DbModels/lyda/Comment.ts";
import {Likable} from "../Models/Likable.ts";
import {Track} from "../Models/DbModels/lyda/Track.ts";

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

    static getUserAvatar(id: number|null) {
        if (id === null) {
            return Images.DEFAULT_AVATAR;
        }
        return ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${MediaFileType.userAvatar}&t=${Date.now()}`;
    }

    static getUserBanner(id: number|null) {
        if (id === null) {
            return Images.DEFAULT_BANNER;
        }
        return ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${MediaFileType.userBanner}&t=${Date.now()}`;
    }

    static getTrackCover(id: number) {
        return ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${MediaFileType.trackCover}&t=${Date.now()}`;
    }

    static getAlbumCover(id: number) {
        return ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${MediaFileType.albumCover}&t=${Date.now()}`;
    }

    static getPlaylistCover(id: number) {
        return ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${MediaFileType.playlistCover}&t=${Date.now()}`;
    }

    static async copyToClipboard(text: string) {
        await navigator.clipboard.writeText(text);
        notify("Copied to clipboard", NotificationType.success);
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
                notify("An error occurred while fetching the user", NotificationType.error);
                return null;
            }
            return Util.mapNullToEmptyString(res.data);
        }
    }

    static arrayPropertyMatchesUser(array: any[], property: any) {
        if (!array || !property || !currentUser.value) {
            return false;
        }
        return array.some((e) => e[property] === currentUser.value!.id);
    }

    static userHasLiked(entity: Likable) {
        return compute(u => !!(u && entity.likes?.some(l => l.user_id === u.id)), currentUser);
    }

    static userHasReposted(entity: Track) {
        return compute(u => !!(u && entity.reposts?.some(r => r.user_id === u.id)), currentUser);
    }

    static userIsFollowing(user: User) {
        return compute(u => !!(u && user.follows?.some(f => f.following_user_id === u.id)), currentUser);
    }

    static userIsFollowedBy(user: User) {
        return compute(u => !!(u && user.follows?.some(f => f.user_id === u.id)), currentUser);
    }

    static async getUserByNameAsync(name: string) {
        const res = await Api.getAsync(ApiRoutes.getUser, { name: nullIfEmpty(name) });
        if (res.code === 401) {
            return null;
        }
        if (res.code === 500) {
            notify("An error occurred while fetching the user", NotificationType.error);
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

    static nestComments(comments: Comment[]): Comment[] {
        const commentMap: Record<number, Comment[]> = {};

        // Step 1: Create a map with parent as key and child comments as the value
        comments.forEach((comment) => {
            const parentId = comment.parent_id ?? 0;

            // If the comment has a parent, group it under the parent's id
            if (!commentMap[parentId]) {
                commentMap[parentId] = [];
            }
            commentMap[parentId].push({ ...comment, comments: [] }); // Ensure comments array exists
        });

        // Step 2: Recursively nest comments
        const buildNestedComments = (parentId: number): Comment[] => {
            if (!commentMap[parentId]) {
                return [];
            }

            return commentMap[parentId].map((comment) => {
                // Assign nested comments recursively
                comment.comments = buildNestedComments(comment.id);
                return comment;
            });
        };

        // Step 3: Start nesting from root-level comments (parent_id === 0)
        return buildNestedComments(0);
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

export function target<T = HTMLInputElement>(e: Event) {
    return e.target as T;
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