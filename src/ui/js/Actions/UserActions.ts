import { HttpClient } from "../Api/HttpClient.ts";
import {
    getUserSettingValue,
    updateImagesWithSource,
    updateUserSetting,
    Util,
} from "../Classes/Util.ts";
import { notify, Ui } from "../Classes/Ui.ts";
import { LydaCache } from "../Cache/LydaCache.ts";
import { CacheItem } from "../Cache/CacheItem.ts";
import { Icons } from "../Enums/Icons.ts";
import { MediaUploader } from "../Api/MediaUploader.ts";
import { Signal } from "@targoninc/jess";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { Api } from "../Api/Api.ts";
import { currentQuality, currentUser, notifications } from "../state.ts";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";
import { NotificationType } from "../Enums/NotificationType.ts";
import { StreamingQuality } from "@targoninc/lyda-shared/src/Enums/StreamingQuality";
import { UserSettings } from "@targoninc/lyda-shared/src/Enums/UserSettings";
import { Theme } from "@targoninc/lyda-shared/src/Enums/Theme";

export class UserActions {
    static async replaceUserImage(
        type: "avatar" | "banner",
        user: User,
        imageSignal: Signal<string>,
        loading: Signal<boolean>
    ) {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async () => {
            loading.value = true;
            if (!fileInput.files) {
                return;
            }
            const file = fileInput.files[0];
            try {
                const mediaType =
                    type === "avatar" ? MediaFileType.userAvatar : MediaFileType.userBanner;
                await MediaUploader.upload(mediaType, user.id, file);
                notify(
                    `${type.charAt(0).toUpperCase() + type.slice(1)} updated`,
                    NotificationType.success
                );
                const newSrc =
                    type === "avatar" ? Util.getUserAvatar(user.id) : Util.getUserBanner(user.id);
                updateImagesWithSource(newSrc, imageSignal.value);
                imageSignal.value = newSrc;
            } catch (e: any) {
                notify(`Failed to upload ${type}: ${e}`, NotificationType.error);
                return;
            } finally {
                loading.value = false;
            }
        };
        fileInput.click();
    }

    static async replaceAvatar(user: User, avatar: Signal<string>, loading: Signal<boolean>) {
        return UserActions.replaceUserImage("avatar", user, avatar, loading);
    }

    static async replaceBanner(
        e: Event,
        user: User,
        banner: Signal<string>,
        loading: Signal<boolean>
    ) {
        return UserActions.replaceUserImage("banner", user, banner, loading);
    }

    static getNotificationsPeriodically() {
        setInterval(UserActions.getNotifications, 60000);
    }

    static async getNotifications() {
        const newestId = notifications.value.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]?.id;
        if (!newestId) {
            notifications.value = (await Api.getNotifications()) ?? [];
        } else {
            const newNotifs = (await Api.getNotifications(newestId)) ?? [];
            const oldNotifs = notifications.value;
            notifications.value = oldNotifs
                .concat(newNotifs.filter(n => !oldNotifs.find(on => on.id === n.id)))
                .sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
        }
    }

    static async setTheme(theme: Theme) {
        const user = await Util.getUserAsync();
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
        themes.map(t => {
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

        await Api.updateUserSetting(UserSettings.theme, themeName);
    }

    static async toggleBooleanUserSetting(key: string) {
        const user = await Util.getUserAsync();
        const newValue = !getUserSettingValue(user, key);
        await Api.updateUserSetting(key, newValue);
        user.settings = updateUserSetting(user, key, newValue.toString());
        LydaCache.set("user", new CacheItem(user));
        currentUser.value = user;
        return true;
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

    static editDescription(currentDescription: string, successCallback: Function) {
        Ui.getTextAreaInputModal(
            "Edit description",
            "Enter your new description",
            currentDescription,
            "Save",
            "Cancel",
            async (description: string) => {
                if (await Api.updateUser({ description })) {
                    successCallback(description);
                }
            },
            () => {},
            Icons.PEN
        ).then();
    }

    static editDisplayname(currentDisplayname: string, successCallback: Function) {
        Ui.getTextInputModal(
            "Edit displayname",
            "Enter your new displayname",
            currentDisplayname,
            "Save",
            "Cancel",
            async (displayname: string) => {
                if (await Api.updateUser({ displayname })) {
                    successCallback(displayname);
                }
            },
            () => {},
            Icons.PEN
        ).then();
    }

    static editUsername(currentUsername: string, successCallback: Function) {
        Ui.getTextInputModal(
            "Edit username",
            "Enter your new username",
            currentUsername,
            "Save",
            "Cancel",
            async (username: string) => {
                if (await Api.updateUser({ username })) {
                    successCallback(username);
                }
            },
            () => {},
            Icons.PEN
        ).then();
    }

    private static setStringSetting(settingKey: string, value: string) {
        return HttpClient.postAsync(ApiRoutes.updateUserSetting, { setting: settingKey, value });
    }
}
