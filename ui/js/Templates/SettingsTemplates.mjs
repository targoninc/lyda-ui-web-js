import {create, signal} from "https://fjs.targoninc.com/f.js";
import {UserActions} from "../Actions/UserActions.mjs";
import {Themes} from "../Enums/Themes.mjs";
import {GenericTemplates} from "./GenericTemplates.mjs";
import {getUserSettingValue} from "../Classes/Util.mjs";

export class SettingsTemplates {
    static settingsPage(user) {
        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Settings")
                    .build(),
                SettingsTemplates.themeSection(getUserSettingValue(user, "theme")),
                SettingsTemplates.behaviourSection(user),
                SettingsTemplates.notificationsSection(user)
            )
            .build();
    }

    static notificationsSection(user) {
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("E-Mail Notifications")
                    .build(),
                SettingsTemplates.notificationToggle("Like notifications", "like", getUserSettingValue(user, "notification_like")),
                SettingsTemplates.notificationToggle("Comment notifications", "comment", getUserSettingValue(user, "notification_comment")),
                SettingsTemplates.notificationToggle("Follow notifications", "follow", getUserSettingValue(user, "notification_follow")),
                SettingsTemplates.notificationToggle("Repost notifications", "repost", getUserSettingValue(user, "notification_repost")),
                SettingsTemplates.notificationToggle("Collaboration notifications", "collaboration", getUserSettingValue(user, "notification_collaboration")),
            ).build();
    }

    static notificationToggle(text, key, currentValue) {
        return GenericTemplates.toggle(text, "notification_" + key, async () => {
            await UserActions.toggleNotificationSetting(key);
        }, [], currentValue);
    }

    static behaviourSection(user) {
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Behaviour")
                    .build(),
                SettingsTemplates.playFromAutoQueueToggle(getUserSettingValue(user, "playFromAutoQueue")),
                SettingsTemplates.publicLikesToggle(getUserSettingValue(user, "publicLikes")),
            ).build();
    }

    static themeSelector(theme, currentTheme$) {
        const active$ = signal(currentTheme$.value === theme ? "active" : "_");
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
        const currentTheme$ = signal(currentTheme);
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