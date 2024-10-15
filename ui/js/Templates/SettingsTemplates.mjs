import {create, signal} from "https://fjs.targoninc.com/f.js";
import {UserActions} from "../Actions/UserActions.mjs";
import {Themes} from "../Enums/Themes.mjs";
import {GenericTemplates} from "./GenericTemplates.mjs";

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