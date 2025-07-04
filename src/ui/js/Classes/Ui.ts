import {Util} from "./Util.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {NavTemplates} from "../Templates/NavTemplates.ts";
import {GenericTemplates, vertical} from "../Templates/generic/GenericTemplates.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {UserActions} from "../Actions/UserActions.ts";
import {signal, HtmlPropertyValue, StringOrSignal, when, AnyNode} from "@targoninc/jess";
import {navigate} from "../Routing/Router.ts";
import {currentUser, navInitialized, openMenus} from "../state.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {Theme} from "@targoninc/lyda-shared/src/Enums/Theme";
import {CollaboratorType} from "@targoninc/lyda-shared/src/Models/db/lyda/CollaboratorType";

export class Ui {
    static async initializeNavBar() {
        await Util.getUser();
        if (document.getElementById("navTop") === null) {
            const burgerMenuOpen = signal(false);
            document.body.prepend(NavTemplates.navTop(burgerMenuOpen));
            document.body.prepend(vertical(when(burgerMenuOpen, NavTemplates.burgerMenuContent(burgerMenuOpen))).build())

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
        if (nav === null && !navInitialized.value) {
            navInitialized.value = true;
            Ui.initializeNavBar().then(() => {
                nav = document.querySelector("nav");
                if (nav && pageBackground) {
                    pageBackground.style.height = (window.innerHeight - nav.clientHeight) + "px";
                }
            });
        }
        if (nav && pageBackground) {
            pageBackground.style.height = (window.innerHeight - nav.clientHeight) + "px";
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
        elements.forEach(element => {
            element.innerHTML = value;
            element.onclick = async () => {
                navigate(newPage, params);
            };
        });
    }

    static showImageModal(imageUrl: StringOrSignal) {
        createModal([GenericTemplates.imageModal(imageUrl)], "image-modal");
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
        createModal([GenericTemplates.confirmationModal(title, text, icon, confirmText, cancelText, confirmCallback2, cancelCallback2)], "confirmation-modal");
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
        createModal([modal], "text-input");
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
        createModal([modal], "text-area-input");
    }

    static async getAddLinkedUserModal(title: StringOrSignal, text: StringOrSignal, currentValue: string,
                                       confirmText: StringOrSignal, cancelText: StringOrSignal,
                                       confirmCallback: Function = () => {}, cancelCallback: Function = () => {},
                                       icon = "") {
        const confirmCallback2 = async (username: string, collabType: number, collabTypes: CollaboratorType[]) => {
            Util.removeModal();
            const user = await Util.getUserByNameAsync(username);
            user.collab_type = collabTypes.find(x => x.id === collabType);
            confirmCallback(username, user);
        };
        const cancelCallback2 = () => {
            cancelCallback();
            Util.removeModal();
        };
        const modal = GenericTemplates.addLinkedUserModal(title, text, currentValue, icon, confirmText, cancelText, confirmCallback2, cancelCallback2);
        createModal([modal], "add-linked-user");
    }
}

const currentNotifications = signal<string[]>([]);

export function notify(text: string, type = NotificationType.info, time = 7000) {
    if (currentNotifications.value.includes(text)) {
        return;
    }
    currentNotifications.value.push(text);
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
        currentNotifications.value = currentNotifications.value.filter(n => n !== text);
    }, time);
}

export function createModal(children: AnyNode[], modalId: string) {
    const modal = GenericTemplates.modal(children, modalId);

    if (openMenus.value.includes(modalId)) {
        return null;
    }

    openMenus.value.push(modalId);
    const interval = setInterval(() => {
        if (!document.getElementById("modal-" + modalId)) {
            clearInterval(interval);
            openMenus.value = openMenus.value.filter(id => id !== modalId);
        }
    }, 500);

    document.body.appendChild(modal);
    Util.initializeModalRemove(modal);
}