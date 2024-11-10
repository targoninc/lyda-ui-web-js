import {create, signal} from "../../fjsc/f2.ts";
import {UserActions} from "../Actions/UserActions.ts";
import {Theme} from "../Enums/Theme.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {getUserSettingValue} from "../Classes/Util.ts";
import {UserSettings} from "../Enums/UserSettings.ts";
import {FJSC} from "../../fjsc";
import {ButtonConfig} from "../../fjsc/Types.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {LydaApi} from "../Api/LydaApi.ts";
import {navigate, reload} from "../Routing/Router.ts";

export class SettingsTemplates {
    static settingsPage(user) {
        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Settings")
                    .build(),
                SettingsTemplates.themeSection(getUserSettingValue(user, UserSettings.theme)),
                SettingsTemplates.behaviourSection(user),
                SettingsTemplates.notificationsSection(user),
                SettingsTemplates.dangerSection(user)
            ).build();
    }

    static notificationsSection(user) {
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("E-Mail Notifications")
                    .build(),
                SettingsTemplates.notificationToggle("Like notifications", "like", getUserSettingValue(user, UserSettings.notificationLike)),
                SettingsTemplates.notificationToggle("Comment notifications", "comment", getUserSettingValue(user, UserSettings.notificationComment)),
                SettingsTemplates.notificationToggle("Follow notifications", "follow", getUserSettingValue(user, UserSettings.notificationFollow)),
                SettingsTemplates.notificationToggle("Repost notifications", "repost", getUserSettingValue(user, UserSettings.notificationRepost)),
                SettingsTemplates.notificationToggle("Collaboration notifications", "collaboration", getUserSettingValue(user, UserSettings.notificationCollaboration)),
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
                SettingsTemplates.playFromAutoQueueToggle(getUserSettingValue(user, UserSettings.playFromAutoQueue)),
                SettingsTemplates.publicLikesToggle(getUserSettingValue(user, UserSettings.publicLikes)),
            ).build();
    }

    static themeSelector(theme, currentTheme$) {
        const active$ = signal(currentTheme$.value === theme ? "active" : "_");
        currentTheme$.onUpdate = (currentTheme) => {
            active$.value = currentTheme === theme ? "active" : "_";
        };

        return FJSC.button(<ButtonConfig>{
            classes: [active$],
            name: `theme-selector-${theme}`,
            text: theme.toUpperCase(),
            onclick: async () => {
                currentTheme$.value = theme;
                await UserActions.setTheme(theme);
            }
        });
    }

    static themeSection(currentTheme) {
        const themes = Object.values(Theme);
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
        return GenericTemplates.toggle("Play from auto queue", UserSettings.playFromAutoQueue, async () => {
            await UserActions.togglePlayFromAutoQueue();
        }, [], currentValue);
    }

    static publicLikesToggle(currentValue) {
        return GenericTemplates.toggle("Make my library public", UserSettings.publicLikes, async () => {
            await UserActions.togglePublicLikes();
        }, [], currentValue);
    }

    private static dangerSection(user) {
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Danger Zone")
                    .build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        FJSC.button({
                            text: "Delete account",
                            classes: ["negative"],
                            onclick: () => {
                                Ui.getConfirmationModal("Delete account", "Are you sure you want to delete your account? This action cannot be undone.",
                                    "Yes, delete my account", "No, keep account", async () => {
                                    LydaApi.deleteUser().then(res => {
                                        if (res.code === 200) {
                                            notify("Account deleted", "success");
                                            navigate("login");
                                        } else {
                                            notify("Account deletion failed", "error");
                                        }
                                    })
                                }, () => {}, "delete").then();
                            }
                        })
                    ).build()
            ).build();
    }
}