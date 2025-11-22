import { notify } from "./Ui.ts";
import { Images } from "../Enums/Images.ts";
import { LydaCache } from "../Cache/LydaCache.ts";
import { CacheItem } from "../Cache/CacheItem.ts";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { chartColor, currentUser, permissions } from "../state.ts";
import { AnyElement, asSignal, compute, signal, Signal } from "@targoninc/jess";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { NotificationType } from "../Enums/NotificationType.ts";
import { Comment } from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import { Api } from "../Api/Api.ts";
import { Icons } from "../Enums/Icons.ts";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType.ts";
import { UserSettings } from "@targoninc/lyda-shared/src/Enums/UserSettings";

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
        if (id === null || id === undefined) {
            return Images.DEFAULT_AVATAR;
        }
        return Util.getImage(id, MediaFileType.userAvatar);
    }

    static getUserBanner(id: number | null) {
        if (id === null) {
            return Images.DEFAULT_BANNER;
        }
        return Util.getImage(id, MediaFileType.userBanner);
    }

    static getImage(id: number, type: MediaFileType) {
        return ApiRoutes.getImageMedia + `?id=${id}&quality=500&mediaFileType=${type}&t=${Date.now()}`;
    }

    static getTrackCover(id: number) {
        return Util.getImage(id, MediaFileType.trackCover);
    }

    static getAlbumCover(id: number) {
        return Util.getImage(id, MediaFileType.albumCover);
    }

    static getPlaylistCover(id: number) {
        return Util.getImage(id, MediaFileType.playlistCover);
    }

    static async fileExists(url: string) {
        const response = await fetch(url);
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
                const userData = structuredClone(currentUser.value);
                if (userData !== null) {
                    return userData;
                }
            }
            return await Util.getUser();
        } else {
            if (allowCache) {
                // TODO: Implement caching for user by id
            }
            try {
                const user = await Api.getUserById(nullIfEmpty(id));
                return Util.mapNullToEmptyString(user);
            } catch (e: any) {
                return null;
            }
        }
    }

    static arrayPropertyMatchesUser(array: any[], property: any) {
        if (!array || !property || !currentUser.value) {
            return false;
        }
        return array.some((e) => e[property] === currentUser.value!.id);
    }

    static isFollowing(user$: User|Signal<User|null>) {
        return compute(u => {
            const user = asSignal(user$).value as User;
            return !!(u && user?.follows?.some(f => f.following_user_id === u.id));
        }, currentUser);
    }

    static isFollowedBy(user: User) {
        return compute(u => !!u && user.following?.some(f => f.user_id === u.id), currentUser);
    }

    static async getUserByNameAsync(name: string) {
        try {
            const user = await Api.getUserByName(nullIfEmpty(name));
            return Util.mapNullToEmptyString(user);
        } catch (e: any) {
            return null;
        }
    }

    static initializeModalRemove(modalContainer: AnyElement) {
        setTimeout(() => {
            document.addEventListener("click", e => {
                const foundModal = document.querySelector(".modal");
                const restrictedTags = ["BUTTON", "INPUT", "TEXTAREA"];
                if (foundModal && !foundModal.contains(target(e)) && !restrictedTags.includes(target(e).tagName)) {
                    Util.removeModal(modalContainer);
                } else {
                    Util.initializeModalRemove(modalContainer);
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
        try {
            const user = await Api.getUserById();
            if (!user) {
                return null;
            }
            currentUser.value = Util.mapNullToEmptyString(user);
        } catch (e: any) {
            return null;
        }
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
    Api.getPermissions().then(res => permissions.value = res ?? []);
    step.value = "complete";

    const referrer = document.referrer;
    if (referrer !== "" && !referrer.includes("login")) {
        //window.location.href = referrer;
    } else {
        //window.location.href = "/home";
    }
}

export function getUserSettingValue<T>(user: User, key: UserSettings) {
    const val = user.settings?.find(s => s.key === key)?.value;
    if (val === "true") return true as T;
    if (val === "false") return false as T;
    return val as T;
}

export function userHasSettingValue(user: User, key: UserSettings, value: string|boolean) {
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

export async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    notify("Copied to clipboard", NotificationType.success);
}

export function getAppLink(entityType: EntityType, id: number) {
    return `web+music://${entityType}/${id}`;
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
    const imgState = signal(Images.DEFAULT_AVATAR);
    if (user?.has_avatar) {
        imgState.value = Util.getUserAvatar(user.id);
    }
    return imgState;
}

export function downloadFile(fileName: string, content: string) {
    const link = document.createElement("a");
    link.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
    link.download = fileName;
    link.click();
}

export function getPlayIcon(isPlaying: Signal<boolean>, isLoading: Signal<boolean>) {
    return compute((p, l) => (p ? Icons.PAUSE : (l ? Icons.SPINNER : Icons.PLAY)), isPlaying, isLoading);
}

export function isDev() {
    return window.location.href.includes("localhost");
}