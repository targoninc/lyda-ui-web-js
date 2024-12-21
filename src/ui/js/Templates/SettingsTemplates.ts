import {create} from "../../fjsc/src/f2.ts";
import {UserActions} from "../Actions/UserActions.ts";
import {Theme} from "../Enums/Theme.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {getUserSettingValue} from "../Classes/Util.ts";
import {UserSettings} from "../Enums/UserSettings.ts";
import {FJSC} from "../../fjsc";
import {ButtonConfig, InputConfig, InputType, TextareaConfig} from "../../fjsc/src/Types.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {LydaApi} from "../Api/LydaApi.ts";
import {User} from "../Models/DbModels/User.ts";
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {navigate} from "../Routing/Router.ts";
import {AuthActions} from "../Actions/AuthActions.ts";
import {NotificationType} from "../Enums/NotificationType.ts";

export class SettingsTemplates {
    static settingsPage(user: User) {
        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Settings")
                    .build(),
                SettingsTemplates.accountSection(user),
                SettingsTemplates.themeSection(getUserSettingValue<Theme>(user, UserSettings.theme)),
                SettingsTemplates.behaviourSection(user),
                SettingsTemplates.notificationsSection(user),
                SettingsTemplates.dangerSection(user),
                SettingsTemplates.linksSection(user),
            ).build();
    }

    static accountSection(user: User) {
        const updatedUser = signal<Partial<User>>({});
        const saveDisabled = compute(u => {
            const keys = Object.keys(u);
            return !keys.some(k => u[k] !== user[k]);
        }, updatedUser);

        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Account")
                    .build(),
                create("p")
                    .text("Change your account settings here.")
                    .build(),
                create("div")
                    .classes("flex-v", "small-card")
                    .children(
                        FJSC.button({
                            text: "Log out",
                            classes: ["negative", "showOnSmallBreakpoint"],
                            icon: { icon: "logout" },
                            onclick: async () => {
                                await AuthActions.logOut();
                            }
                        }),
                        FJSC.input(<InputConfig<string>>{
                            type: InputType.text,
                            label: "Username",
                            name: "username",
                            required: true,
                            value: user.username,
                            onchange: v => {
                                updatedUser.value = { ...updatedUser.value, username: v };
                            }
                        }),
                        FJSC.input(<InputConfig<string>>{
                            type: InputType.text,
                            label: "Display name",
                            name: "displayname",
                            required: true,
                            value: user.displayname,
                            onchange: v => {
                                updatedUser.value = { ...updatedUser.value, displayname: v };
                            }
                        }),
                        FJSC.input(<InputConfig<string>>{
                            type: InputType.email,
                            label: "E-Mail address",
                            name: "email",
                            required: true,
                            value: user.email,
                            onchange: v => {
                                updatedUser.value = { ...updatedUser.value, email: v };
                            }
                        }),
                        FJSC.textarea(<TextareaConfig>{
                            label: "Description",
                            name: "description",
                            value: user.description,
                            onchange: v => {
                                updatedUser.value = { ...updatedUser.value, description: v };
                            }
                        }),
                    ).build(),
                FJSC.button(<ButtonConfig>{
                    disabled: saveDisabled,
                    classes: ["positive"],
                    text: "Save changes",
                    icon: { icon: "save" },
                    onclick: async () => {
                        if (await LydaApi.updateUser(updatedUser.value)) {
                            user = { ...user, ...updatedUser.value };
                            window.location.reload();
                        }
                    }
                })
            ).build();
    }

    static notificationsSection(user: User) {
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

    static notificationToggle(text: string, key: string, currentValue: boolean) {
        return GenericTemplates.toggle(text, "notification_" + key, async () => {
            await UserActions.toggleNotificationSetting(key);
        }, [], currentValue);
    }

    static behaviourSection(user: User) {
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

    static themeSelector(theme: Theme, currentTheme$: Signal<Theme>) {
        const active$ = compute(c => c === theme ? "active" : "_", currentTheme$);

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

    static themeSection(currentTheme: Theme) {
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

    static playFromAutoQueueToggle(currentValue: boolean) {
        return GenericTemplates.toggle("Play from auto queue", UserSettings.playFromAutoQueue, async () => {
            await UserActions.togglePlayFromAutoQueue();
        }, [], currentValue);
    }

    static publicLikesToggle(currentValue: boolean) {
        return GenericTemplates.toggle("Make my library public", UserSettings.publicLikes, async () => {
            await UserActions.togglePublicLikes();
        }, [], currentValue);
    }

    private static dangerSection(user: User) {
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Danger Zone")
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        FJSC.button({
                            text: "Delete account",
                            icon: { icon: "delete" },
                            classes: ["negative"],
                            onclick: () => {
                                Ui.getConfirmationModal("Delete account", "Are you sure you want to delete your account? This action cannot be undone.",
                                    "Yes, delete my account", "No, keep account", async () => {
                                    LydaApi.deleteUser().then(res => {
                                        if (res.code === 200) {
                                            notify("Account deleted", NotificationType.success);
                                            navigate("login");
                                            window.location.reload();
                                        } else {
                                            notify("Account deletion failed", NotificationType.error);
                                        }
                                    })
                                }, () => {}, "delete").then();
                            }
                        }),
                        FJSC.button({
                            text: "Download data",
                            icon: { icon: "download" },
                            onclick: () => {
                                LydaApi.exportUser().then(res => {
                                    if (res.code === 200) {
                                        const blob = new Blob([JSON.stringify(res.data)], { type: 'application/octet-stream' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `userdata-${user.username}.json`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                    }
                                });
                            }
                        })
                    ).build()
            ).build();
    }

    private static linksSection(user: User) {
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Links")
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.gif8831("/img/88x31/targoninc.gif", "https://targoninc.com"),
                        GenericTemplates.gif8831("/img/88x31/firefox.gif", "https://www.mozilla.org/en-US/firefox/new/"),
                        GenericTemplates.gif8831("/img/88x31/discord.gif", "https://discord.gg/QeNU8b7Hbb"),
                        GenericTemplates.gif8831("/img/88x31/ubuntu.gif", "https://ubuntu.com/"),
                        GenericTemplates.gif8831("/img/88x31/hetzner.gif", "https://www.hetzner.com/"),
                    ).build()
            ).build();
    }
}