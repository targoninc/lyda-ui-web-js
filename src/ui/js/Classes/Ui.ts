import {Util} from "./Util.ts";
import {Api} from "../Api/Api.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {NavTemplates} from "../Templates/NavTemplates.ts";
import {GenericTemplates} from "../Templates/GenericTemplates.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {UserActions} from "../Actions/UserActions.ts";
import {AnyElement, HtmlPropertyValue, StringOrSignal} from "../../fjsc/src/f2.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {Theme} from "../Enums/Theme.ts";
import {navigate} from "../Routing/Router.ts";
import {signal} from "../../fjsc/src/signals.ts";
import {currentUser, navInitialized, notifications} from "../state.ts";
import {User} from "../Models/DbModels/lyda/User.ts";
import {CollaboratorType} from "../Models/DbModels/lyda/CollaboratorType.ts";
import {TrackCollaborator} from "../Models/DbModels/lyda/TrackCollaborator.ts";
import {Notification} from "../Models/DbModels/lyda/Notification.ts";
import {NotificationType} from "../Enums/NotificationType.ts";

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

    static addModal(modal: AnyElement|null) {
        if (!modal) {
            return;
        }
        document.body.appendChild(modal);
        Util.initializeModalRemove(modal);
    }

    static async initializeNavBar() {
        let signedIn = true;
        await Util.getUser();
        if (!currentUser.value) {
            signedIn = false;
        }
        if (document.getElementById("navTop") === null) {
            let userTemplateRender;
            if (signedIn) {
                await UserActions.getNotifications();
                userTemplateRender = NavTemplates.accountSection();
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

    static async getPageHtml(page: string) {
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
            notify("Could not load page.", NotificationType.error);
            throw new Error(`No content for page ${page}.`);
        }
    }

    static async windowResize() {
        let pageBackground = document.querySelector(".page-background") as HTMLElement;
        let nav = document.querySelector("nav");
        let footer = document.querySelector("footer");
        if (nav === null && !navInitialized.value) {
            navInitialized.value = true;
            await Ui.initializeNavBar();
            nav = document.querySelector("nav");
        }
        if (nav && footer && pageBackground) {
            pageBackground.style.height = (window.innerHeight - nav.clientHeight - footer.clientHeight - 1) + "px";
        }
    }

    static async loadTheme() {
        const darkPreferred = window.matchMedia("(prefers-color-scheme: dark)");
        const user = currentUser.value;
        if (!user) {
            await UserActions.setUiTheme(Theme.dark, true);
            return;
        }
        const existingSetting = user.settings?.find(s => s.key === "theme");
        if (!existingSetting) {
            const newTheme = darkPreferred.matches ? "dark" : "light";
            await UserActions.setUiTheme(newTheme as Theme);
            LydaCache.set("user", new CacheItem(user));
        } else {
            await UserActions.setUiTheme(existingSetting.value as Theme, true);
        }
    }

    static async initUser(userToShow: string|null) {
        if (!userToShow) {
            return false;
        }
        return await Util.getUserByNameAsync(userToShow);
    }

    static setImagesSource(userId: number, className: string, source: string) {
        let images = document.querySelectorAll("." + className + "[data-user-id='" + userId + "']") as NodeListOf<HTMLImageElement>;
        for (let i = 0; i < images.length; i++) {
            images[i].src = source;
        }
    }

    static fillClassWithValue(userId: number, className: string, value: string, newPage = "", params: string[] = []) {
        let elements = document.querySelectorAll("." + className + "[data-user-id='" + userId + "']") as NodeListOf<HTMLElement>;
        for (let element of elements) {
            element.innerHTML = value;
            element.onclick = async () => {
                navigate(newPage, params);
            };
        }
    }

    static showImageModal(imageUrl: StringOrSignal) {
        const modal = GenericTemplates.imageModal(imageUrl);
        Ui.addModal(modal);
    }

    static async getConfirmationModal(title: StringOrSignal, text: StringOrSignal, confirmText: StringOrSignal,
                                      cancelText: StringOrSignal, confirmCallback = () => {}, cancelCallback = () => {
    }, icon: StringOrSignal = "") {
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

    static async getTextInputModal(title: HtmlPropertyValue, text: HtmlPropertyValue, currentValue: string, confirmText: StringOrSignal, cancelText: StringOrSignal, confirmCallback: Function, cancelCallback: Function = () => {
    }, icon = "") {
        const value = signal(currentValue);
        const confirmCallback2 = () => {
            confirmCallback(value.value);
            Util.removeModal();
        };
        const cancelCallback2 = () => {
            cancelCallback();
            Util.removeModal();
        };
        const modal = GenericTemplates.textInputModal(title, text, currentValue, value, icon, confirmText, cancelText, confirmCallback2, cancelCallback2);
        Ui.addModal(modal);
    }

    static async getTextAreaInputModal(title: HtmlPropertyValue, text: HtmlPropertyValue, currentValue: string, confirmText: StringOrSignal, cancelText: StringOrSignal, confirmCallback: Function = () => {}, cancelCallback: Function = () => {
    }, icon = "") {
        const value = signal(currentValue);
        const confirmCallback2 = () => {
            confirmCallback(value.value);
            Util.removeModal();
        };
        const cancelCallback2 = () => {
            cancelCallback();
            Util.removeModal();
        };
        const modal = GenericTemplates.textAreaInputModal(title, text, currentValue, value, icon, confirmText, cancelText, confirmCallback2, cancelCallback2);
        Ui.addModal(modal);
    }

    static async getAddLinkedUserModal(title: StringOrSignal, text: StringOrSignal, currentValue: string,
                                       confirmText: StringOrSignal, cancelText: StringOrSignal,
                                       confirmCallback: Function = () => {}, cancelCallback: Function = () => {},
                                       icon = "") {
        const confirmCallback2 = async (username: string, newUser: TrackCollaborator, collabTypes: CollaboratorType[]) => {
            Util.removeModal();
            const user = await Util.getUserByNameAsync(username);
            user.collab_type = collabTypes.find(x => x.id === newUser.collab_type?.id);
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

export function notify(text: string, type = NotificationType.info, time = 7000) {
    const notifications = document.querySelector(".notifications");
    const notification = GenericTemplates.notification(type, text);
    const previousNotifications = document.querySelectorAll(".notification") as NodeListOf<HTMLElement>;
    if (previousNotifications) {
        const lastNotification = previousNotifications[previousNotifications.length - 1];
        if (lastNotification) {
            notification.style.top = lastNotification.offsetTop + lastNotification.clientHeight + "px";
        }
    }
    notifications?.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, time);
}
