import {Api} from "../Classes/Api.mjs";
import {getUserSettingValue, updateUserSetting, Util} from "../Classes/Util.mjs";
import {Ui} from "../Classes/Ui.mjs";
import {LydaCache} from "../Cache/LydaCache.mjs";
import {CacheItem} from "../Cache/CacheItem.mjs";
import {Icons} from "../Enums/Icons.mjs";
import {NavTemplates} from "../Templates/NavTemplates.mjs";
import {Themes} from "../Enums/Themes.mjs";

export class UserActions {
    static updateAvatar(newSrc) {
        if (newSrc === "") {
            const avatar = document.querySelector(".avatar-container img");
            avatar.src = newSrc;
        }
        if (!this.fileExists(newSrc)) {
            setTimeout(() => {
                this.updateAvatar(newSrc);
            }, 1000);
        } else {
            const avatar = document.querySelector(".avatar-container img");
            avatar.src = newSrc;
        }
    }

    static updateBanner(newSrc) {
        if (newSrc === "") {
            const banner = document.querySelector(".banner-container img");
            banner.src = newSrc;
        }
        if (!this.fileExists(newSrc)) {
            setTimeout(() => {
                this.updateBanner(newSrc);
            }, 1000);
        } else {
            const banner = document.querySelector(".banner-container img");
            banner.src = newSrc;
        }
    }

    static async fileExists(url) {
        let response = await fetch(url);
        return response.status === 200;
    }

    static async replaceAvatar(e) {
        if (e.target.getAttribute("isOwnProfile") !== "true") {
            return;
        }
        let fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async (e) => {
            const loader = document.querySelector("#avatar-loader");
            loader.classList.remove("hidden");
            let file = e.target.files[0];
            let formData = new FormData();
            formData.append("avatar", file);
            let response = await fetch(Api.endpoints.user.actions.avatar.upload, {
                method: "POST",
                body: formData,
                credentials: "include"
            });
            if (response.status === 200) {
                loader.classList.add("hidden");
                const user = LydaCache.get("user").content;
                LydaCache.set("user", new CacheItem(user));
                Ui.notify("Avatar updated", "success");
                UserActions.updateAvatar(URL.createObjectURL(file));
            }
        };
        fileInput.click();
    }

    static async deleteAvatar() {
        await Ui.getConfirmationModal("Remove avatar", "Are you sure you want to remove your avatar?", "Yes", "No", async () => {
            const loader = document.querySelector("#avatar-loader");
            loader.classList.remove("hidden");
            let response = await fetch(Api.endpoints.user.actions.avatar.delete, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            if (response.status === 200) {
                loader.classList.add("hidden");
                const user = LydaCache.get("user").content;
                LydaCache.set("user", new CacheItem(user));
                Ui.notify("Avatar removed", "success");
                UserActions.updateAvatar(await Util.getAvatarFromUserIdAsync(user.id));
            }
        }, () => {}, Icons.WARNING);
    }

    static async replaceBanner(e) {
        if (e.target.getAttribute("isOwnProfile") !== "true") {
            return;
        }
        if (e.target.classList.contains("avatar-container")) {
            return;
        }
        let fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async (e) => {
            const loader = document.querySelector("#banner-loader");
            loader.classList.remove("hidden");
            let file = e.target.files[0];
            let formData = new FormData();
            formData.append("banner", file);
            let response = await fetch(Api.endpoints.user.actions.banner.upload, {
                method: "POST",
                body: formData
            });
            if (response.status === 200) {
                loader.classList.add("hidden");
                const user = LydaCache.get("user").content;
                LydaCache.set("user", new CacheItem(user));
                Ui.notify("Banner updated", "success");
                UserActions.updateBanner(await Util.getBannerFromUserIdAsync(user.id) + "?t=" + Date.now());
            }
        };
        fileInput.click();
    }

    static async deleteBanner() {
        await Ui.getConfirmationModal("Remove banner", "Are you sure you want to remove your banner?", "Yes", "No",
            async () => {
                const loader = document.querySelector("#banner-loader");
                loader.classList.remove("hidden");
                let response = await fetch(Api.endpoints.user.actions.banner.delete, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
                if (response.status === 200) {
                    loader.classList.add("hidden");
                    const user = LydaCache.get("user").content;
                    LydaCache.set("user", new CacheItem(user));
                    Ui.notify("Banner removed", "success");
                    UserActions.updateBanner(await Util.getBannerFromUserIdAsync(user.id));
                }
            },
            () => {}, Icons.WARNING
        );
    }

    static getNotificationsPeriodically(e) {
        setInterval(async () => {
            const timestamp = document.querySelector(".listNotification")?.getAttribute("data-created_at");
            if (!timestamp) {
                return;
            }
            const res = await Api.getAsync(Api.endpoints.notifications.get, { after: timestamp });
            if (res.code !== 200) {
                return;
            }
            const notifications = res.data;
            if (notifications.length > 0) {
                const notificationList = document.querySelector(".notification-list");
                if (notificationList) {
                    for (const notification of notifications) {
                        notificationList.prepend(NavTemplates.notificationInList(notification.type, notification.isRead, notification.createdAt, notification.message, notification.data));
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

    static async markNotificationsAsRead(e) {
        let notificationList = document.querySelector(".notification-list");
        notificationList.classList.toggle("hidden");
        let timestamp;
        try {
            timestamp = document.querySelector(".listNotification.unread")?.getAttribute("data-created_at");
        } catch (e) {
            console.warn(e);
            return;
        }
        if (e.target.getAttribute("markedAsRead") === "true" || !timestamp) {
            return;
        }
        await Api.postAsync(Api.endpoints.notifications.actions.markAllAsRead, {newest: timestamp});
        e.target.setAttribute("markedAsRead", "true");
        const notificationBubble = document.querySelector(".notification-bubble");
        if (notificationBubble) {
            notificationBubble.classList.add("hidden");
        }
    }

    static async setTheme(theme) {
        let user = await Util.getUserAsync();
        user.settings = updateUserSetting(user, "theme", theme);
        LydaCache.set("user", new CacheItem(user));
        await UserActions.setUiTheme(theme);
    }

    static async setUiTheme(themeName, onlyLocal = false) {
        const themes = Object.values(Themes);
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
        const res = await Api.postAsync(Api.endpoints.user.actions.updateSetting, { setting: "theme", value: themeName });
        if (res.code !== 200) {
            Ui.notify("Failed to update theme", "error");
        }
    }

    static async setBooleanUserSetting(key, value) {
        const res = await Api.postAsync(Api.endpoints.user.actions.updateSetting, {
            setting: key,
            value
        });
        if (res.code !== 200) {
            Ui.notify("Failed to update user setting", "error");
            return false;
        }
        return true;
    }

    static async setPublicLikes(publicLikes) {
        const res = await Api.postAsync(Api.endpoints.user.actions.updateSetting, {
            setting: "publicLikes",
            value: publicLikes
        });
        if (res.code !== 200) {
            Ui.notify("Failed to update public likes", "error");
            return false;
        }
        return true;
    }

    static async toggleBooleanUserSetting(key) {
        const user = await Util.getUserAsync();
        const newValue = !getUserSettingValue(user, key);
        if (await UserActions.setBooleanUserSetting(key, newValue)) {
            user.settings = updateUserSetting(user, key, newValue);
            LydaCache.set("user", new CacheItem(user));
            return true;
        }
        return false;
    }

    static async togglePlayFromAutoQueue() {
        return await UserActions.toggleBooleanUserSetting("playFromAutoQueue");
    }

    static async togglePublicLikes() {
        return await UserActions.toggleBooleanUserSetting("publicLikes");
    }

    static async toggleNotificationSetting(key) {
        const settingKey = "notification_" + key;
        return await UserActions.toggleBooleanUserSetting(settingKey);
    }

    static async openProfileFromElement(e) {
        e.preventDefault();
        let target = e.target;
        if (e.target.classList.contains("follow-button")) {
            return;
        }
        let username = target.getAttribute("username");
        if (username === "") {
            return;
        }
        window.router.navigate("profile/" + username);
    }

    static async unverifyUser(id) {
        const res = await Api.postAsync(Api.endpoints.user.actions.unverify, { id });
        if (res.code !== 200) {
            Ui.notify("Failed to unverify user", "error");
            return false;
        }
        return true;
    }

    static async verifyUser(id) {
        const res = await Api.postAsync(Api.endpoints.user.actions.verify, { id });
        if (res.code !== 200) {
            Ui.notify("Failed to verify user", "error");
            return false;
        }
        return true;
    }

    static editDescription(currentDescription, successCallback) {
        Ui.getTextAreaInputModal("Edit description", "Enter your new description", currentDescription, "Save", "Cancel", async (description) => {
            const res = await Api.postAsync(Api.endpoints.user.set.property, { property: "description", value: description });
            if (res.code !== 200) {
                Ui.notify("Failed to update description", "error");
                return;
            }
            const user = LydaCache.get("user").content;
            user.description = description;
            LydaCache.set("user", new CacheItem(user));
            Ui.notify("Description updated", "success");
            successCallback(description);
        }, () => {}, Icons.PEN).then();
    }

    static editDisplayname(currentDisplayname, successCallback) {
        Ui.getTextInputModal("Edit displayname", "Enter your new displayname", currentDisplayname, "Save", "Cancel", async (displayname) => {
            const res = await Api.postAsync(Api.endpoints.user.set.property, {
                property: "displayname",
                value: displayname
            });
            if (res.code !== 200) {
                Ui.notify("Failed to update displayname", "error");
                return;
            }
            const user = LydaCache.get("user").content;
            user.displayname = displayname;
            LydaCache.set("user", new CacheItem(user));
            Ui.notify("Displayname updated", "success");
            successCallback(displayname);
        }, () => {
        }, Icons.PEN).then();
    }

    static editUsername(currentUsername, successCallback) {
        Ui.getTextInputModal("Edit username", "Enter your new username", currentUsername, "Save", "Cancel", async (username) => {
            const res = await Api.postAsync(Api.endpoints.user.set.property, {
                property: "username",
                value: username
            });
            if (res.code !== 200) {
                Ui.notify("Failed to update username", "error");
                return;
            }
            const user = LydaCache.get("user").content;
            user.username = username;
            LydaCache.set("user", new CacheItem(user));
            Ui.notify("Username updated", "success");
            successCallback(username);
        }, () => {
        }, Icons.PEN).then();
    }
}