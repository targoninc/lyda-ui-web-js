import {Api} from "../Api/Api.ts";
import {getUserSettingValue, target, updateUserSetting, Util} from "../Classes/Util.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {Icons} from "../Enums/Icons.js";
import {NavTemplates} from "../Templates/NavTemplates.ts";
import {Theme} from "../Enums/Theme.ts";
import {UserSettings} from "../Enums/UserSettings.ts";
import {MediaFileType} from "../Enums/MediaFileType.ts";
import {MediaUploader} from "../Api/MediaUploader.ts";
import {User} from "../Models/DbModels/User.ts";
import {Signal} from "../../fjsc/src/signals.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {Notification} from "../Models/DbModels/Notification.ts";
import {LydaApi} from "../Api/LydaApi.ts";
import {Images} from "../Enums/Images.ts";

export class UserActions {
    static updateImagesWithSource(newSrc: string, oldSrc: string) {
        oldSrc = oldSrc.replace(/\?t=\d+/, "");
        const imgs = document.querySelectorAll("img[src='" + oldSrc + "']") as NodeListOf<HTMLImageElement>;
        for (const img of imgs) {
            img.src = newSrc;
        }
    }

    static async fileExists(url: string) {
        let response = await fetch(url);
        return response.status === 200;
    }

    static async replaceAvatar(e: Event, isOwnProfile: boolean, user: User, avatar: Signal<string>, loading: Signal<boolean>) {
        if (!isOwnProfile) {
            return;
        }
        let fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async (e) => {
            loading.value = true;
            if (!fileInput.files) {
                return;
            }

            const file = fileInput.files![0];
            try {
                await MediaUploader.upload(MediaFileType.userAvatar, user.id, file)
                notify("Avatar updated", "success");
                const newSrc = await Util.getAvatarFromUserIdAsync(user.id);
                UserActions.updateImagesWithSource(newSrc, avatar.value);
                avatar.value = newSrc;
            } catch (e: any) {
                notify(`Failed to upload avatar: ${e}`, "error");
                return;
            } finally {
                loading.value = false;
            }
        };
        fileInput.click();
    }

    static async deleteAvatar(user: User, avatar: Signal<string>, loading: Signal<boolean>) {
        await Ui.getConfirmationModal("Remove avatar", "Are you sure you want to remove your avatar?", "Yes", "No", async () => {
            loading.value = true;
            let response = await Api.postAsync(ApiRoutes.deleteMedia, {
                type: MediaFileType.userAvatar,
                referenceId: user.id
            });
            loading.value = false;
            if (response.code === 200) {
                notify("Avatar removed", "success");
                UserActions.updateImagesWithSource(Images.DEFAULT_AVATAR, avatar.value);
                avatar.value = Images.DEFAULT_BANNER;
            }
        }, () => {}, Icons.WARNING);
    }

    static async replaceBanner(e: Event, isOwnProfile: boolean, user: User, banner: Signal<string>, loading: Signal<boolean>) {
        if (!isOwnProfile || target(e).classList.contains("avatar-container")) {
            return;
        }

        let fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async () => {
            loading.value = true;
            if (!fileInput.files) {
                return;
            }
            let file = fileInput.files![0];

            try {
                await MediaUploader.upload(MediaFileType.userBanner, user.id, file);
                notify("Banner updated", "success");
                const newSrc = await Util.getBannerFromUserIdAsync(user.id);
                UserActions.updateImagesWithSource(newSrc, banner.value);
                banner.value = newSrc;
            } catch (e: any) {
                notify(`Failed to upload banner: ${e}`, "error");
                return;
            } finally {
                loading.value = false;
            }
        };
        fileInput.click();
    }

    static async deleteBanner(user: User, banner: Signal<string>, loading: Signal<boolean>) {
        await Ui.getConfirmationModal("Remove banner", "Are you sure you want to remove your banner?", "Yes", "No",
            async () => {
                loading.value = true;
                let response = await Api.postAsync(ApiRoutes.deleteMedia, {
                    type: MediaFileType.userBanner,
                    referenceId: user.id
                });
                loading.value = false;
                if (response.code === 200) {
                    notify("Banner removed", "success");
                    UserActions.updateImagesWithSource(Images.DEFAULT_BANNER, banner.value);
                    banner.value = Images.DEFAULT_BANNER;
                } else {
                    notify(`Failed to remove banner: ${response.data.error}`, "error");
                }
            },
            () => {}, Icons.WARNING
        );
    }

    static getNotificationsPeriodically(e: HTMLElement) {
        setInterval(async () => {
            const timestamp = document.querySelector(".listNotification")?.getAttribute("data-created_at");
            if (!timestamp) {
                return;
            }
            const res = await Api.getAsync(ApiRoutes.getAllNotifications, { after: timestamp });
            if (res.code !== 200) {
                return;
            }
            const notifications = res.data as Notification[];
            if (notifications.length > 0) {
                const notificationList = document.querySelector(".notification-list");
                if (notificationList) {
                    for (const notification of notifications) {
                        // TODO: Add data
                        notificationList.prepend(NavTemplates.notificationInList(notification.type, notification.is_read, notification.created_at, notification.message, {}));
                    }
                    const notificationBubble = document.querySelector(".notification-bubble");
                    if (notificationBubble) {
                        notificationBubble.classList.remove("hidden");
                    }
                    e.setAttribute("markedAsRead", "false");
                }
            }
        }, 60000);
    }

    static async markNotificationsAsRead(e: Event) {
        let notificationList = document.querySelector(".notification-list");
        notificationList?.classList.toggle("hidden");
        let timestamp;
        try {
            timestamp = document.querySelector(".listNotification.unread")?.getAttribute("data-created_at");
        } catch (e) {
            console.warn(e);
            return;
        }
        const target = e.target as HTMLElement;
        if (target.getAttribute("markedAsRead") === "true" || !timestamp) {
            return;
        }
        await Api.postAsync(ApiRoutes.markAllNotificationsAsRead, {newest: timestamp});
        target.setAttribute("markedAsRead", "true");
        const notificationBubble = document.querySelector(".notification-bubble");
        if (notificationBubble) {
            notificationBubble.classList.add("hidden");
        }
    }

    static async setTheme(theme: Theme) {
        let user = await Util.getUserAsync();
        user.settings = updateUserSetting(user, UserSettings.theme, theme);
        LydaCache.set("user", new CacheItem(user));
        await UserActions.setUiTheme(theme);
    }

    static async setUiTheme(themeName: Theme, onlyLocal = false) {
        const themes = Object.values(Theme);
        if (!themes.includes(themeName)) {
            console.warn("Unknown theme: ", themeName);
            return;
        }
        themes.map((t) => {
            if (t === themeName) {
                return;
            }
            Util.removeStylesheet("/styles/" + t + ".css");
        });
        Util.includeStylesheet(`/styles/${themeName}.css`);
        if (onlyLocal) {
            return;
        }

        const res = await Api.postAsync(ApiRoutes.updateUserSetting, { setting: UserSettings.theme, value: themeName });
        if (res.code !== 200) {
            notify("Failed to update theme", "error");
        }
    }

    static async setBooleanUserSetting(key: string, value: boolean) {
        const res = await Api.postAsync(ApiRoutes.updateUserSetting, {
            setting: key,
            value
        });
        if (res.code !== 200) {
            notify("Failed to update user setting", "error");
            return false;
        }
        return true;
    }

    static async toggleBooleanUserSetting(key: string) {
        const user = await Util.getUserAsync();
        const newValue = !getUserSettingValue(user, key);
        if (await UserActions.setBooleanUserSetting(key, newValue)) {
            user.settings = updateUserSetting(user, key, newValue.toString());
            LydaCache.set("user", new CacheItem(user));
            return true;
        }
        return false;
    }

    static async togglePlayFromAutoQueue() {
        return await UserActions.toggleBooleanUserSetting(UserSettings.playFromAutoQueue);
    }

    static async togglePublicLikes() {
        return await UserActions.toggleBooleanUserSetting(UserSettings.publicLikes);
    }

    static async toggleNotificationSetting(key: string) {
        const settingKey = "notification_" + key;
        return await UserActions.toggleBooleanUserSetting(settingKey);
    }

    static async unverifyUser(id: number) {
        const res = await Api.postAsync(ApiRoutes.unverifyUser, { id });
        if (res.code !== 200) {
            notify("Failed to unverify user", "error");
            return false;
        }
        return true;
    }

    static async verifyUser(id: number) {
        const res = await Api.postAsync(ApiRoutes.verifyUser, { id });
        if (res.code !== 200) {
            notify("Failed to verify user", "error");
            return false;
        }
        return true;
    }

    static editDescription(currentDescription: string, successCallback: Function) {
        Ui.getTextAreaInputModal("Edit description", "Enter your new description", currentDescription, "Save", "Cancel", async (description: string) => {
            if (await LydaApi.updateUser({ description })) {
                successCallback(description);
            }
        }, () => {}, Icons.PEN).then();
    }

    static editDisplayname(currentDisplayname: string, successCallback: Function) {
        Ui.getTextInputModal("Edit displayname", "Enter your new displayname", currentDisplayname, "Save", "Cancel", async (displayname: string) => {
            if (await LydaApi.updateUser({ displayname })) {
                successCallback(displayname);
            }
        }, () => {
        }, Icons.PEN).then();
    }

    static editUsername(currentUsername: string, successCallback: Function) {
        Ui.getTextInputModal("Edit username", "Enter your new username", currentUsername, "Save", "Cancel", async (username: string) => {
            if (await LydaApi.updateUser({ username })) {
                successCallback(username);
            }
        }, () => {
        }, Icons.PEN).then();
    }
}