import {create, FjsObservable} from "https://fjs.targoninc.com/f.js";
import {CacheItem} from "../Cache/CacheItem.mjs";
import {Api} from "../Classes/Api.mjs";
import {UserActions} from "../Actions/UserActions.mjs";
import {LydaCache} from "../Cache/LydaCache.mjs";
import {Themes} from "../Enums/Themes.mjs";
import {GenericTemplates} from "./GenericTemplates.mjs";
import {Icons} from "../Enums/Icons.mjs";
import {Ui} from "../Classes/Ui.mjs";
import {Util} from "../Classes/Util.mjs";

export class SettingsTemplates {
    static settingsPage(userSettings) {
        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Settings")
                    .build(),
                SettingsTemplates.themeSection(userSettings.uiTheme),
                SettingsTemplates.behaviourSection(userSettings),
                SettingsTemplates.accountManagementSection(),
                SettingsTemplates.notificationsSection(userSettings)
            )
            .build();
    }

    static notificationsSection(userSettings) {
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("E-Mail Notifications")
                    .build(),
                SettingsTemplates.notificationToggle("Like notifications", "like", userSettings.notification_like),
                SettingsTemplates.notificationToggle("Comment notifications", "comment", userSettings.notification_comment),
                SettingsTemplates.notificationToggle("Follow notifications", "follow", userSettings.notification_follow),
                SettingsTemplates.notificationToggle("Repost notifications", "repost", userSettings.notification_repost),
                SettingsTemplates.notificationToggle("Collaboration notifications", "collaboration", userSettings.notification_collaboration),
            ).build();
    }

    static notificationToggle(text, key, currentValue) {
        return GenericTemplates.toggle(text, "notification_" + key, async () => {
            await UserActions.toggleNotification(key);
        }, [], currentValue);
    }

    static accountManagementSection() {
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Account Management")
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        SettingsTemplates.serviceRelatedLinks(),
                        SettingsTemplates.refreshProfileButton()
                    ).build()
            )
            .build();
    }

    static serviceRelatedLinks() {
        return create("div")
            .classes("flex")
            .children(
                GenericTemplates.action(Icons.SUBSCRIPTIONS, "Manage Subscriptions", "subscriptions", () => {
                    window.open("https://finance.targoninc.com", "_blank");
                }, [], ["secondary"]),
                GenericTemplates.action(Icons.ACCOUNTS, "Manage Account", "accounts", () => {
                    window.open("https://accounts.targoninc.com", "_blank");
                }, [], ["secondary"]),
            ).build();
    }

    static behaviourSection(userSettings) {
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Behaviour")
                    .build(),
                SettingsTemplates.playFromAutoQueueToggle(userSettings.playFromAutoQueue),
                SettingsTemplates.publicLikesToggle(userSettings.publicLikes),
            )
            .build();
    }

    static themeSelector(theme, currentTheme$) {
        const active$ = new FjsObservable(currentTheme$.value === theme ? "active" : "_");
        currentTheme$.onUpdate = (currentTheme) => {
            active$.value = currentTheme === theme ? "active" : "_";
        };
        return create("div")
            .classes("fakeButton", "secondary", "rounded", "padded-inline", "flex", "clickable", "theme-selector", active$)
            .text(theme.toUpperCase())
            .onclick(async () => {
                currentTheme$.value = theme;
                await UserActions.setTheme(theme);
            }).build();
    }

    static themeSection(currentTheme) {
        const themes = Object.values(Themes);
        const currentTheme$ = new FjsObservable(currentTheme);
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Theme")
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        ...themes.map(theme => SettingsTemplates.themeSelector(theme, currentTheme$))
                    ).build(),
            ).build();
    }

    static refreshProfileButton() {
        return GenericTemplates.action(Icons.RELOAD, "Refresh profile info", "refreshProfileInfo", async () => {
            const res = await Api.getAsync(Api.endpoints.user.get);
            if (res.code === 200) {
                const user = res.data;
                LydaCache.set("user", new CacheItem(user));
                await Ui.initUser(user.username);
                Ui.notify("Refreshed profile info", "success");
            }
        });
    }

    static playFromAutoQueueToggle(currentValue) {
        return GenericTemplates.toggle("Play from auto queue", "playFromAutoQueue", async () => {
            await UserActions.togglePlayFromAutoQueue();
        }, [], currentValue);
    }

    static publicLikesToggle(currentValue) {
        return GenericTemplates.toggle("Make my library public", "publicLikes", async () => {
            await UserActions.togglePublicLikes();
        }, [], currentValue);
    }
}