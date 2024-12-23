import {create, ifjs} from "../../fjsc/src/f2.ts";
import {UserActions} from "../Actions/UserActions.ts";
import {Theme} from "../Enums/Theme.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {getUserSettingValue} from "../Classes/Util.ts";
import {UserSettings} from "../Enums/UserSettings.ts";
import {FJSC} from "../../fjsc";
import {ButtonConfig, InputConfig, InputType, TextareaConfig} from "../../fjsc/src/Types.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {LydaApi} from "../Api/LydaApi.ts";
import {User} from "../Models/DbModels/lyda/User.ts";
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {navigate} from "../Routing/Router.ts";
import {AuthActions} from "../Actions/AuthActions.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {StreamingQuality} from "../Enums/StreamingQuality.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {currentUser} from "../state.ts";
import {AuthApi} from "../Api/AuthApi.ts";

export class SettingsTemplates {
    static settingsPage() {
        const user = currentUser.value;
        if (!user) {
            navigate("login");
            return;
        }

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Settings")
                    .build(),
                SettingsTemplates.accountSection(user),
                SettingsTemplates.themeSection(getUserSettingValue<Theme>(user, UserSettings.theme)),
                SettingsTemplates.qualitySection(getUserSettingValue<StreamingQuality>(user, UserSettings.streamingQuality) ?? "m"),
                SettingsTemplates.behaviourSection(user),
                SettingsTemplates.notificationsSection(user),
                SettingsTemplates.dangerSection(user),
                SettingsTemplates.linksSection(),
            ).build();
    }

    static accountSection(user: User) {
        const updatedUser = signal<Partial<User>>({});
        const saveDisabled = compute((u: Record<string, any>) => {
            const keys = Object.keys(u);
            return !keys.some(k => u[k] !== user[k]);
        }, updatedUser);
        const notActivated = !(user.activation?.includes("@") ?? false);
        const activationTimedOut = signal(false);

        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Account")
                    .build(),
                FJSC.button({
                    text: "Log out",
                    classes: ["negative", "showOnSmallBreakpoint"],
                    icon: { icon: "logout" },
                    onclick: async () => {
                        await AuthActions.logOut();
                    }
                }),
                ifjs(user.subscription, FJSC.button({
                    icon: { icon: "payments" },
                    text: "Manage subscription",
                    classes: ["positive"],
                    onclick: () => {
                        navigate("subscribe");
                    }
                })),
                ifjs(user.subscription, FJSC.button({
                    icon: { icon: "payments" },
                    text: "Subscribe for more features",
                    classes: ["special"],
                    onclick: () => {
                        navigate("subscribe");
                    }
                }), true),
                create("p")
                    .text("Change your account settings here.")
                    .build(),
                SettingsTemplates.userImageSettings(user),
                create("div")
                    .classes("flex-v", "small-card")
                    .children(
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
                        ifjs(notActivated, create("div")
                            .classes("flex", "noflexwrap", "color-dim")
                            .children(
                                FJSC.icon({
                                    icon: "new_releases",
                                    adaptive: true,
                                    classes: ["text-positive"],
                                }),
                                create("span")
                                    .classes("text-positive")
                                    .text("Your E-mail address is verified.")
                                    .build()
                            ).build(), true),
                        ifjs(notActivated, FJSC.button({
                            icon: { icon: "verified_user" },
                            text: "Verify E-mail",
                            classes: ["positive"],
                            disabled: activationTimedOut,
                            onclick: async () => {
                                await AuthApi.sendActivationEmail();
                                activationTimedOut.value = true;
                                setTimeout(() => {
                                    activationTimedOut.value = false;
                                }, 60 * 1000);
                            }
                        })),
                        ifjs(activationTimedOut, create("span")
                            .classes("text-positive")
                            .text("E-Mail sent, check your inbox and click the link to activate your account.")
                            .build()),
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
            text: theme.toUpperCase(),
            onclick: async () => {
                currentTheme$.value = theme;
                await UserActions.setTheme(theme);
            }
        });
    }

    static qualitySelector(value: StreamingQuality, currentValue$: Signal<StreamingQuality>) {
        const active$ = compute(c => c === value ? "active" : "_", currentValue$);

        return FJSC.button(<ButtonConfig>{
            classes: [active$, `quality-selector-${value}`, value === StreamingQuality.high ? "special" : "_"],
            text: value.toUpperCase(),
            onclick: async () => {
                currentValue$.value = value;
                await UserActions.setStreamingQuality(value);
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

    static qualitySection(currentValue: StreamingQuality) {
        const values = Object.values(StreamingQuality);
        const currentValue$ = signal(currentValue);
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Streaming quality")
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        ...values.map(value => SettingsTemplates.qualitySelector(value, currentValue$))
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

    private static linksSection() {
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

    private static userImageSettings(user: User) {
        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "card", "small-card", "secondary")
                    .children(
                        create("span")
                            .text("Avatar")
                            .build(),
                        UserTemplates.avatarDeleteButton(user),
                        UserTemplates.avatarReplaceButton(user)
                    ).build(),
                create("div")
                    .classes("flex", "card", "small-card", "secondary")
                    .children(
                        create("span")
                            .text("Banner")
                            .build(),
                        UserTemplates.bannerDeleteButton(user),
                        UserTemplates.bannerReplaceButton(user)
                    ).build()
            ).build();
    }
}