import {userHasSettingValue, Util} from "./Util.ts";
import {UrlHandler} from "./UrlHandler.ts";
import {Api} from "./Api.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {NavTemplates} from "../Templates/NavTemplates.ts";
import {GenericTemplates} from "../Templates/GenericTemplates.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {UserActions} from "../Actions/UserActions.ts";

export class Ui {
    static validUrlPaths = {
        home: "home",
        search: "search",
        settings: "settings",
        playlist: "playlist",
        album: "album",
        explore: "explore",
        following: "following",
        profile: "profile",
    };

    static addModal(modal) {
        document.body.appendChild(modal);
        Util.initializeModalRemove(modal);
    }

    static async initializeNavBar() {
        let signedIn = true;
        let user = await Util.getUserAsync();
        if (!user) {
            signedIn = false;
        }
        if (document.getElementById("navTop") === null) {
            let userTemplateRender;
            if (signedIn) {
                const res = await Api.getAsync(Api.endpoints.notifications.get);
                let notifications = [];
                if (res.code !== 200) {
                    userTemplateRender = NavTemplates.notSignedInNote();
                } else {
                    notifications = res.data;
                    userTemplateRender = NavTemplates.signedInNote(user, await Util.getAvatarFromUserIdAsync(user.id), notifications);
                }
            } else {
                userTemplateRender = NavTemplates.notSignedInNote();
            }
            document.body.prepend(NavTemplates.navTop(userTemplateRender));

            setTimeout(() => {
                window.onresize = async () => {
                    await Ui.windowResize();
                };
            }, 1000);
        }
    }

    static notify(text, type = "info", time = 7000) {
        const notifications = document.querySelector(".notifications");
        const notification = GenericTemplates.notification(type, text);
        const previousNotifications = document.querySelectorAll(".notification");
        if (previousNotifications) {
            const lastNotification = previousNotifications[previousNotifications.length - 1];
            if (lastNotification) {
                notification.style.top = lastNotification.offsetTop + lastNotification.clientHeight + "px";
            }
        }
        notifications.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, time);
    }

    waitForImage(imgElem) {
        return new Promise(res => {
            if (imgElem.complete) {
                return res();
            }
            imgElem.onload = () => res();
            imgElem.onerror = () => res();
        });
    }

    static async getPageHtml(page) {
        let cachedContent = LydaCache.get("page/" + page).content;
        if (cachedContent) {
            return cachedContent;
        }

        let r = await fetch(`/pages/${page}.html`);
        if (r.status !== 200) {
            return null;
        }
        let pageContent = await r.text();
        if (pageContent) {
            LydaCache.set("page/" + page, new CacheItem(pageContent));
            return pageContent;
        } else {
            Ui.notify("Could not load page.", "error");
            throw new Error(`No content for page ${page}.`);
        }
    }

    static updateNavBar(currentPage) {
        let navs = document.querySelectorAll(".nav");
        for (let nav of navs) {
            nav.classList.remove("active");
            if (nav.id === currentPage) {
                nav.classList.add("active");
            }
        }
    }

    static async windowResize() {
        let pageBackground = document.querySelector(".page-background");
        let nav = document.querySelector("nav");
        let footer = document.querySelector("footer");
        if (nav === null && !window.navInitialized) {
            window.navInitialized = true;
            await Ui.initializeNavBar();
            nav = document.querySelector("nav");
        }
        if (nav && footer) {
            pageBackground.style.height = (window.innerHeight - nav.clientHeight - footer.clientHeight - 1) + "px";
        }
    }

    static async loadTheme(user) {
        const darkPreferred = window.matchMedia("(prefers-color-scheme: dark)");
        if (!user) {
            await UserActions.setUiTheme("dark", true);
            return;
        }
        const existingSetting = user.settings.find(s => s.key === "theme");
        if (!existingSetting) {
            const newTheme = darkPreferred.matches ? "dark" : "light";
            await UserActions.setUiTheme(newTheme);
            LydaCache.set("user", new CacheItem(user));
        } else {
            await UserActions.setUiTheme(existingSetting.value, true);
        }
    }

    static async initUser(userToShow) {
        if (!userToShow) {
            return false;
        }
        const user = await Util.getUserByNameAsync(userToShow);
        if (!user) {
            return false;
        }

        Ui.fillClassWithValue(user.id, "user-displayname", user.displayname, "user", [`user=${user.username}`]);
        Ui.fillClassWithValue(user.id, "user-name", "@" + user.username, "user", [`user=${user.username}`]);
        Ui.fillClassWithValue(user.id, "user-theme", user.theme);
        Ui.fillClassWithValue(user.id, "user-trackview", user.trackview);
        Ui.setImagesSource(user.id, "user-avatar", await Util.getAvatarFromUserIdAsync(user.id));
        Ui.setImagesSource(user.id, "user-banner", await Util.getAvatarFromUserIdAsync(user.id));

        return true;
    }

    static setImagesSource(userId, className, source) {
        let images = document.querySelectorAll("." + className + "[data-user-id='" + userId + "']");
        for (let i = 0; i < images.length; i++) {
            images[i].src = source;
        }
    }

    static fillClassWithValue(userId, className, value, newPage = "", params = []) {
        let elements = document.querySelectorAll("." + className + "[data-user-id='" + userId + "']");
        for (let element of elements) {
            element.innerHTML = value;
            element.onclick = async () => {
                navigate(newPage, params);
            };
        }
    }

    static getImageModal(imageUrl) {
        const modal = GenericTemplates.imageModal(imageUrl);
        Ui.addModal(modal);
    }

    static async getConfirmationModal(title, text, confirmText, cancelText, confirmCallback = () => {}, cancelCallback = () => {
    }, icon = "") {
        const confirmCallback2 = () => {
            confirmCallback();
            Util.removeModal();
        };
        const cancelCallback2 = () => {
            cancelCallback();
            Util.removeModal();
        };
        const modal = GenericTemplates.confirmationModal(title, text, icon, confirmText, cancelText, confirmCallback2, cancelCallback2);
        Ui.addModal(modal);
    }

    static async getTextInputModal(title, text, currentValue, confirmText, cancelText, confirmCallback = () => {}, cancelCallback = () => {
    }, icon = "") {
        const confirmCallback2 = () => {
            const value = document.getElementById("textInputModalInput").value;
            confirmCallback(value);
            Util.removeModal();
        };
        const cancelCallback2 = () => {
            cancelCallback();
            Util.removeModal();
        };
        const modal = GenericTemplates.textInputModal(title, text, currentValue, icon, confirmText, cancelText, confirmCallback2, cancelCallback2);
        Ui.addModal(modal);
    }

    static async getTextAreaInputModal(title, text, currentValue, confirmText, cancelText, confirmCallback = () => {}, cancelCallback = () => {
    }, icon = "") {
        const confirmCallback2 = () => {
            const value = document.getElementById("textAreaInputModalInput").value;
            confirmCallback(value);
            Util.removeModal();
        };
        const cancelCallback2 = () => {
            cancelCallback();
            Util.removeModal();
        };
        const modal = GenericTemplates.textAreaInputModal(title, text, currentValue, icon, confirmText, cancelText, confirmCallback2, cancelCallback2);
        Ui.addModal(modal);
    }

    static async getAddLinkedUserModal(title, text, currentValue, confirmText, cancelText, confirmCallback = () => {}, cancelCallback = () => {
    }, icon = "") {
        const confirmCallback2 = async (username, newUser, collabTypes) => {
            Util.removeModal();
            const user = await Util.getUserByNameAsync(username);
            user.collab_type = collabTypes.find(x => x.id === newUser.collab_type);
            confirmCallback(username, user);
        };
        const cancelCallback2 = () => {
            cancelCallback();
            Util.removeModal();
        };
        const modal = GenericTemplates.addLinkedUserModal(title, text, currentValue, icon, confirmText, cancelText, confirmCallback2, cancelCallback2);
        Ui.addModal(modal);
    }
}
