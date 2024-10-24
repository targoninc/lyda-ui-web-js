import {Ui} from "./Ui.ts";
import {UrlHandler} from "./UrlHandler.ts";
import {Images} from "../Enums/Images.ts";
import {Config} from "./Config.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {Api} from "./Api.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {Icons} from "../Enums/Icons.js";
import {AnyElement} from "../../fjsc/f2.ts";

export class Util {
    static capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    static getUrlParameter(name) {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        return urlParams.get(name);
    }

    static showButtonLoader(e) {
        try { 
            e.target.querySelector(".loader").classList.remove("hidden"); e.target.querySelector("span").classList.add("hidden"); 
        } catch (e) { /* empty */ }
    }

    static hideButtonLoader(t) {
        try { 
            t.querySelector(".loader").classList.add("hidden"); t.querySelector("span").classList.remove("hidden"); 
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

    static toHexString(id) {
        if (id === null || id === undefined) {
            return "";
        }
        if (id.constructor === String) {
            id = parseInt(id);
        }
        // noinspection JSCheckFunctionSignatures
        return id.toString(16); // This accepts a parameter, radix, which is an integer between 2 and 36 that represents the base of the number in the string.
    }

    static initializeDraggable(draggable) {
        window.dragging = false;
        let thisIsDragged = false;
        let offset = { x: 0, y: 0 };
        draggable.addEventListener("mousedown", function(e) {
            if (window.dragging && !thisIsDragged) {
                return;
            }
            window.dragging = true;
            thisIsDragged = true;
            offset = {
                x: draggable.offsetLeft - e.clientX,
                y: draggable.offsetTop - e.clientY
            };
        }, true);

        document.addEventListener("mouseup", function() {
            window.dragging = false;
            thisIsDragged = false;
        }, true);

        document.addEventListener("mousemove", function(event) {
            event.preventDefault();
            if (window.dragging && thisIsDragged) {
                draggable.style.left = (event.clientX + offset.x) + "px";
                draggable.style.top = (event.clientY + offset.y) + "px";
                window.getSelection().removeAllRanges();
            }
        }, true);
    }

    static async getAvatarFromUserIdAsync(id: number|null) {
        if (id === null) {
            return Images.DEFAULT_AVATAR;
        }
        const baseUrl = Config.getKey("storageBaseUrl") + "/storage/v2/avatars/";
        return await this.getFileOrBackupAsync(baseUrl + Util.toHexString(id) + Images.FORMAT, Images.DEFAULT_AVATAR);
    }

    static async getBannerFromUserIdAsync(id: number|null) {
        if (id === null) {
            return Images.DEFAULT_BANNER;
        }
        const baseUrl = Config.getKey("storageBaseUrl") + "/storage/v2/banners/";
        return await this.getFileOrBackupAsync(baseUrl + Util.toHexString(id) + Images.FORMAT, Images.DEFAULT_BANNER);
    }

    static async getCoverFileFromTrackIdAsync(id: number, user_id: number|null = null) {
        const baseUrl = Config.getKey("storageBaseUrl") + "/storage/v2/covers/tracks/";
        return await this.getFileOrBackupAsync(baseUrl + Util.toHexString(id) + Images.FORMAT, Util.getAvatarFromUserIdAsync(user_id));
    }

    static async getCoverFileFromAlbumIdAsync(id: number, user_id: number|null = null) {
        const baseUrl = Config.getKey("storageBaseUrl") + "/storage/v2/covers/albums/";
        return await this.getFileOrBackupAsync(baseUrl + Util.toHexString(id) + Images.FORMAT, Util.getAvatarFromUserIdAsync(user_id));
    }

    static async getCoverFileFromPlaylistIdAsync(id: number, user_id: number|null = null) {
        const baseUrl = Config.getKey("storageBaseUrl") + "/storage/v2/covers/playlists/";
        return await this.getFileOrBackupAsync(baseUrl + Util.toHexString(id) + Images.FORMAT, Util.getAvatarFromUserIdAsync(user_id));
    }

    static async getFileOrBackupAsync(url: string, backupUrl: string) {
        const res = await fetch(url);
        if (res.status === 200) {
            return url;
        }
        return backupUrl;
    }

    static async copyToClipboard(text: string) {
        await navigator.clipboard.writeText(text);
        Ui.notify("Copied to clipboard", "success");
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

    static getTrackIdFromEvent(e) {
        try {
            return e.target.getAttribute("track_id");
        } catch (e) {
            console.error(e);
            return "";
        }
    }

    static getAlbumIdFromEvent(e) {
        try {
            return e.target.getAttribute("album_id");
        } catch (e) {

            console.error(e);
            return "";
        }
    }

    static getPlaylistIdFromEvent(e) {
        try {
            return e.target.getAttribute("playlist_id");
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

    static formatDate(date) {
        if (date.constructor === String) {
            date = new Date(date);
        }
        return date.toLocaleDateString();
    }

    static getDateForPicker(date) {
        if (date.constructor === String) {
            date = new Date(date);
        }
        return date.toISOString().split("T")[0];
    }

    static hideElementIfCondition(conditionFunc = () => false, className: string, e: Event) {
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
            document.addEventListener("click", Util.hideElementIfCondition.bind(null, conditionFunc, className), { once: true });
        }
    }

    /**
     *
     * @param id
     * @param noCache
     * @returns {Promise<null|User>}
     */
    static async getUserAsync(id = null, noCache = false) {
        if (!id) {
            if (!noCache) {
                const rawCachedUser = LydaCache.get("user").content;
                const userData = Util.parseCachedUser(rawCachedUser);
                if (userData !== null) {
                    return Util.mapNullToEmptyString(userData);
                }
            }
            return await Util.getUser();
        } else {
            if (!noCache) {
                const cachedUser = LydaCache.get("user:" + id).content;
                const userData = Util.parseCachedUser(cachedUser);
                if (userData !== null) {
                    return Util.mapNullToEmptyString(userData);
                }
            }
            const res = await Api.getAsync(Api.endpoints.user.get, { id: nullIfEmpty(id) });
            if (res.code === 401) {
                return null;
            }
            if (res.code === 500) {
                Ui.notify("An error occurred while fetching the user", "error");
                return null;
            }
            return Util.mapNullToEmptyString(res.data);
        }
    }

    static arrayPropertyMatchesUser(array, property, user) {
        if (!array || !property || !user) {
            return false;
        }
        return array.some((e) => e[property] === user.id);
    }

    static async getUserByNameAsync(name) {
        const res = await Api.getAsync(Api.endpoints.user.get, { name: nullIfEmpty(name) });
        if (res.code === 401) {
            return null;
        }
        if (res.code === 500) {
            Ui.notify("An error occurred while fetching the user", "error");
            return null;
        }
        return Util.mapNullToEmptyString(res.data);
    }

    static initializeModalRemove(modalContainer) {
        setTimeout(() => {
            document.addEventListener("click", e => {
                const foundModal = document.querySelector(".modal");
                if (foundModal && !foundModal.contains(e.target)) {
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

    static parseCachedUser(rawCachedUser) {
        let userData;
        try {
            userData = JSON.parse(rawCachedUser);
        } catch(e) {
            userData = rawCachedUser;
        }
        return userData;
    }

    static mapNullToEmptyString(obj) {
        for (const key in obj) {
            if (obj[key] === null) {
                obj[key] = "";
            }
        }
        return obj;
    }

    static async getUser() {
        const cacheKey = "user";
        let userData;
        const res = await Api.getAsync(Api.endpoints.user.get);
        if (res.code === 401) {
            return null;
        }
        userData = res.data;
        LydaCache.set(cacheKey, new CacheItem(JSON.stringify(userData)));
        if (userData === null) {
            return null;
        }
        return Util.mapNullToEmptyString(userData);
    }

    static mergeObjects(obj1, obj2) {
        for (const key in obj2) {
            obj1[key] = obj2[key];
        }
        return obj1;
    }

    static mergeObjectList(objList) {
        let obj = {};
        objList.forEach((o) => {
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
     * @param commentList
     */
    static nestCommentElementsByCommentList(commentList) {
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

    static getUserIdFromEvent(e) {
        const userId = e.target.getAttribute("user_id");
        if (userId === null) {
            return "";
        }
        return userId;
    }

    static updateUiThemeToggle(uiTheme) {
        const modeSwitch = document.querySelector(".dark-mode-switch");
        if (modeSwitch) {
            modeSwitch.setAttribute("theme", uiTheme);
        }
        const lamp = document.querySelector(".dark-mode-switch img");
        if (lamp) {
            lamp.src = uiTheme === "dark" ? Icons.LAMP_OFF : Icons.LAMP_ON;
        }
    }

    static includeStylesheet(css) {
        const links = document.head.querySelectorAll("link[href='" + css + "']");
        if (links !== null && links.length > 0) {
            return;
        }
        const link = document.createElement("link");
        link.setAttribute("rel", "stylesheet");
        link.setAttribute("href", css);
        document.head.appendChild(link);
    }

    static removeStylesheet(css) {
        const links = document.head.querySelectorAll("link[href='" + css + "']");
        if (links !== null) {
            links.forEach((l) => {
                l.remove();
            });
        }
    }

    static isLoggedIn() {
        const cacheUser = LydaCache.get("user");
        return cacheUser !== null && cacheUser.content !== null;
    }

    static downloadFile(fileName, content) {
        const link = document.createElement("a");
        link.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
        link.download = fileName;
        link.click();
    }
}

export function nullIfEmpty(value) {
    if (value === undefined) {
        return null;
    }

    return value;
}

export function finalizeLogin(step, user) {
    LydaCache.set("user", new CacheItem(JSON.stringify(user)));
    step.value = "complete";

    let referrer = document.referrer;
    if (referrer !== "" && !referrer.includes("login")) {
        //window.location.href = referrer;
    } else {
        //window.location.href = "/home";
    }
}

export function getUserSettingValue(user, key) {
    const val = user.settings.find(s => s.key === key)?.value;
    if (val === "true") return true;
    if (val === "false") return false;
    return val;
}

export function userHasSettingValue(user, key, value) {
    return getUserSettingValue(user, key) === value;
}

export function updateUserSetting(user, key, value) {
    return user.settings.map(s => {
        if (s.key === key) {
            s.value = value;
        }
        return s;
    })
}