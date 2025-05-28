import {notify} from "./Ui.ts";
import {Images} from "../Enums/Images.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {Api, ApiResponse} from "../Api/Api.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {chartColor, currentUser} from "../state.ts";
import {compute, signal, Signal, AnyElement, isSignal, asSignal} from "@targoninc/jess";
import {getUserPermissions} from "../../main.ts";
import {MediaFileType} from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {NotificationType} from "../Enums/NotificationType.ts";
import {Comment} from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";

export class Util {
    static capitalizeFirstLetter(string: string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    static getUrlParameter(name: string) {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        return urlParams.get(name);
    }

    static defaultImage(type: string) {
        switch (type) {
            case "user":
                return Images.DEFAULT_AVATAR;
            case "track":
                return Images.DEFAULT_COVER_TRACK;
            case "album":
                return Images.DEFAULT_COVER_ALBUM;
            case "playlist":
                return Images.DEFAULT_COVER_PLAYLIST;
        }
        return Images.DEFAULT_COVER_TRACK;
    }

    static getUserAvatar(id: number | null | undefined) {
        if (id === null) {
            return Images.DEFAULT_AVATAR;
        }
        return ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${MediaFileType.userAvatar}&t=${Date.now()}`;
    }

    static getUserBanner(id: number | null) {
        if (id === null) {
            return Images.DEFAULT_BANNER;
        }
        return ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${MediaFileType.userBanner}&t=${Date.now()}`;
    }

    static getCover(id: number, type: MediaFileType) {
        return ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${type}&t=${Date.now()}`;
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

    static formatDate(date: string | Date) {
        if (date.constructor === String) {
            date = new Date(date);
        }
        return (date as Date).toLocaleDateString();
    }

    static async getUserAsync(id: number | null = null, allowCache = true) {
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
            const res = await Api.getAsync<User>(ApiRoutes.getUser, {id: nullIfEmpty(id)});
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

    static userIsFollowing(user$: User|Signal<User|null>) {
        return compute(u => {
            const user = asSignal(user$).value;
            return !!(u && user?.follows?.some(f => f.following_user_id === u.id));
        }, currentUser);
    }

    static userIsFollowedBy(user: User) {
        return compute(u => !!(u && user.follows?.some(f => f.user_id === u.id)), currentUser);
    }

    static async getUserByNameAsync(name: string) {
        const res = await Api.getAsync(ApiRoutes.getUser, {name: nullIfEmpty(name)});
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

    static removeModal(modal: AnyElement | null = null) {
        if (modal === null || !(modal instanceof HTMLElement)) {
            modal = document.querySelector(".modal-container");
        }
        if (modal) {
            modal.remove();
        }
    }

    static parseCachedUser(rawCachedUser: string | User | null) {
        let userData;
        try {
            userData = JSON.parse(rawCachedUser as string);
        } catch (e) {
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

    static nestComments(comments: Comment[]): Comment[] {
        const commentMap: Record<number, Comment[]> = {};

        // Step 1: Create a map with parent as key and child comments as the value
        comments.forEach((comment) => {
            const parentId = comment.parent_id ?? 0;

            // If the comment has a parent, group it under the parent's id
            if (!commentMap[parentId]) {
                commentMap[parentId] = [];
            }
            commentMap[parentId].push({...comment, comments: []}); // Ensure comments array exists
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

    static setForeGroundColor() {
        const rootElement = document.documentElement;
        chartColor.value = getComputedStyle(rootElement).getPropertyValue('--color-5').trim();
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
    getUserPermissions();
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

export async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    notify("Copied to clipboard", NotificationType.success);
}


export function updateImagesWithSource(newSrc: string, oldSrc: string) {
    oldSrc = oldSrc.replace(/&t=\d+/, "");
    const imgs = document.querySelectorAll("img") as NodeListOf<HTMLImageElement>;
    imgs.forEach(img => {
        if (img.src.includes(oldSrc)) {
            img.src = newSrc;
        }
    });
}

export function getAvatar(user: User | null | undefined) {
    const avatarState = signal(Images.DEFAULT_AVATAR);
    if (user?.has_avatar) {
        avatarState.value = Util.getUserAvatar(user.id);
    }
    return avatarState;
}

export function downloadFile(fileName: string, content: string) {
    const link = document.createElement("a");
    link.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
    link.download = fileName;
    link.click();
}