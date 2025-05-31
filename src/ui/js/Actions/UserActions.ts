import {Api} from "../Api/Api.ts";
import {
    getErrorMessage,
    getUserSettingValue,
    updateImagesWithSource,
    updateUserSetting,
    Util
} from "../Classes/Util.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {Icons} from "../Enums/Icons.ts";
import {MediaUploader} from "../Api/MediaUploader.ts";
import {Signal} from "@targoninc/jess";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {LydaApi} from "../Api/LydaApi.ts";
import {currentQuality, currentUser, notifications} from "../state.ts";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {MediaFileType} from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {Notification} from "@targoninc/lyda-shared/src/Models/db/lyda/Notification";
import {StreamingQuality} from "@targoninc/lyda-shared/src/Enums/StreamingQuality";
import {UserSettings} from "@targoninc/lyda-shared/src/Enums/UserSettings";
import {Theme} from "@targoninc/lyda-shared/src/Enums/Theme";

export class UserActions {
    static async replaceAvatar(user: User, avatar: Signal<string>, loading: Signal<boolean>) {
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
                notify("Avatar updated", NotificationType.success);
                const newSrc = Util.getUserAvatar(user.id);
                updateImagesWithSource(newSrc, avatar.value);
                avatar.value = newSrc;
            } catch (e: any) {
                notify(`Failed to upload avatar: ${e}`, NotificationType.error);
                return;
            } finally {
                loading.value = false;
            }
        };
        fileInput.click();
    }

    static async replaceBanner(e: Event, user: User, banner: Signal<string>, loading: Signal<boolean>) {
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
                notify("Banner updated", NotificationType.success);
                const newSrc = Util.getUserBanner(user.id);
                updateImagesWithSource(newSrc, banner.value);
                banner.value = newSrc;
            } catch (e: any) {
                notify(`Failed to upload banner: ${e}`, NotificationType.error);
                return;
            } finally {
                loading.value = false;
            }
        };
        fileInput.click();
    }

    static getNotificationsPeriodically() {
        setInterval(UserActions.getNotifications, 60000);
    }

    static async getNotifications() {
        const newestId = notifications.value.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.id;
        let res;
        if (!newestId) {
            res = await Api.getAsync<Notification[]>(ApiRoutes.getAllNotifications);
            if (res.code === 200) {
                notifications.value = res.data;
            }
        } else {
            res = await Api.getAsync<Notification[]>(ApiRoutes.getAllNotifications, {after: newestId});
            if (res.code === 200) {
                notifications.value = notifications.value.concat(res.data).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            }
        }
    }

    static async markNotificationsAsRead(newestTimestamp: Signal<Date | null>) {
        await Api.postAsync(ApiRoutes.markAllNotificationsAsRead, {newest: newestTimestamp.value});
    }

    static async setTheme(theme: Theme) {
        let user = await Util.getUserAsync();
        user.settings = updateUserSetting(user, UserSettings.theme, theme);
        LydaCache.set("user", new CacheItem(user));
        await UserActions.setUiTheme(theme);
    }

    static async setStreamingQuality(quality: StreamingQuality) {
        currentQuality.value = quality;
        await UserActions.setStringSetting(UserSettings.streamingQuality, quality);
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
        Util.setForeGroundColor();
        if (onlyLocal) {
            return;
        }

        const res = await Api.postAsync(ApiRoutes.updateUserSetting, {setting: UserSettings.theme, value: themeName});
        if (res.code !== 200) {
            notify(`Failed to update theme: ${getErrorMessage(res)}`, NotificationType.error);
        }
    }

    static async setBooleanUserSetting(key: string, value: boolean) {
        const res = await Api.postAsync(ApiRoutes.updateUserSetting, {
            setting: key,
            value
        });
        if (res.code !== 200) {
            notify("Failed to update user setting", NotificationType.error);
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
            currentUser.value = user;
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
        const res = await Api.postAsync(ApiRoutes.unverifyUser, {id});
        if (res.code !== 200) {
            notify("Failed to unverify user", NotificationType.error);
            return false;
        }
        return true;
    }

    static async verifyUser(id: number) {
        const res = await Api.postAsync(ApiRoutes.verifyUser, {id});
        if (res.code !== 200) {
            notify("Failed to verify user", NotificationType.error);
            return false;
        }
        return true;
    }

    static editDescription(currentDescription: string, successCallback: Function) {
        Ui.getTextAreaInputModal("Edit description", "Enter your new description", currentDescription, "Save", "Cancel", async (description: string) => {
            if (await LydaApi.updateUser({description})) {
                successCallback(description);
            }
        }, () => {
        }, Icons.PEN).then();
    }

    static editDisplayname(currentDisplayname: string, successCallback: Function) {
        Ui.getTextInputModal("Edit displayname", "Enter your new displayname", currentDisplayname, "Save", "Cancel", async (displayname: string) => {
            if (await LydaApi.updateUser({displayname})) {
                successCallback(displayname);
            }
        }, () => {
        }, Icons.PEN).then();
    }

    static editUsername(currentUsername: string, successCallback: Function) {
        Ui.getTextInputModal("Edit username", "Enter your new username", currentUsername, "Save", "Cancel", async (username: string) => {
            if (await LydaApi.updateUser({username})) {
                successCallback(username);
            }
        }, () => {
        }, Icons.PEN).then();
    }

    private static setStringSetting(settingKey: string, value: string) {
        return Api.postAsync(ApiRoutes.updateUserSetting, {setting: settingKey, value});
    }
}