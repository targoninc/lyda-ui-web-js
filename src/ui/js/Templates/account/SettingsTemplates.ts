import {create, ifjs, signalMap} from "../../../fjsc/src/f2.ts";
import {UserActions} from "../../Actions/UserActions.ts";
import {Theme} from "../../Enums/Theme.ts";
import {GenericTemplates} from "../GenericTemplates.ts";
import {getUserSettingValue, Util} from "../../Classes/Util.ts";
import {UserSettings} from "../../Enums/UserSettings.ts";
import {FJSC} from "../../../fjsc";
import {ButtonConfig, InputConfig, InputType, TextareaConfig} from "../../../fjsc/src/Types.ts";
import {notify, Ui} from "../../Classes/Ui.ts";
import {LydaApi} from "../../Api/LydaApi.ts";
import {User} from "../../Models/DbModels/lyda/User.ts";
import {compute, Signal, signal} from "../../../fjsc/src/signals.ts";
import {navigate, reload} from "../../Routing/Router.ts";
import {AuthActions} from "../../Actions/AuthActions.ts";
import {NotificationType} from "../../Enums/NotificationType.ts";
import {StreamingQuality} from "../../Enums/StreamingQuality.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {currentUser, permissions} from "../../state.ts";
import {AuthApi} from "../../Api/AuthApi.ts";
import {UserEmail} from "../../Models/DbModels/lyda/UserEmail.ts";
import {Api} from "../../Api/Api.ts";
import {Permission} from "../../Models/DbModels/lyda/Permission.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";
import {RoutePath} from "../../Routing/routes.ts";

export class SettingsTemplates {
    static settingsPage() {
        const user = currentUser.value;
        if (!user) {
            navigate(RoutePath.login);
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
                SettingsTemplates.permissionsSection(),
                SettingsTemplates.behaviourSection(user),
                SettingsTemplates.notificationsSection(user),
                SettingsTemplates.dangerSection(user),
                SettingsTemplates.linksSection(),
            ).build();
    }

    static permissionsSection() {
        const hasAnyPermissions = compute(p => p.length > 0, permissions);

        return create("div")
            .children(
                ifjs(hasAnyPermissions, create("div")
                    .classes("card", "flex-v")
                    .children(
                        create("h2")
                            .text("My Permissions")
                            .build(),
                        signalMap(permissions, create("div").classes("flex-v"), (permission: Permission) => SettingsTemplates.permissionCard(permission))
                    ).build()),
            ).build();
    }

    static permissionCard(permission: Permission) {
        return create("div")
            .children(
                create("span")
                    .text(permission.name)
                    .build(),
            ).build();
    }

    static accountSection(user: User) {
        const updatedUser = signal<Partial<User>>({});
        const saveDisabled = compute((u: Record<string, any>) => {
            const keys = Object.keys(u);
            return !keys.some(k => u[k] !== user[k]);
        }, updatedUser);

        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Account")
                    .build(),
                FJSC.button({
                    text: "Log out",
                    classes: ["negative", "showOnSmallBreakpoint"],
                    icon: {icon: "logout"},
                    onclick: async () => {
                        await AuthActions.logOut();
                    }
                }),
                create("p")
                    .text("Change your account settings here.")
                    .build(),
                ifjs(user.subscription, FJSC.button({
                    icon: {icon: "payments"},
                    text: "Manage subscription",
                    classes: ["positive"],
                    onclick: () => navigate(RoutePath.subscribe)
                })),
                ifjs(user.subscription, FJSC.button({
                    icon: {icon: "payments"},
                    text: "Subscribe for more features",
                    classes: ["special"],
                    onclick: () => navigate(RoutePath.subscribe)
                }), true),
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
                                updatedUser.value = {...updatedUser.value, username: v};
                            }
                        }),
                        FJSC.input(<InputConfig<string>>{
                            type: InputType.text,
                            label: "Display name",
                            name: "displayname",
                            required: true,
                            value: user.displayname,
                            onchange: v => {
                                updatedUser.value = {...updatedUser.value, displayname: v};
                            }
                        }),
                        FJSC.textarea(<TextareaConfig>{
                            label: "Description",
                            name: "description",
                            value: user.description,
                            onchange: v => {
                                updatedUser.value = {...updatedUser.value, description: v};
                            }
                        }),
                        SettingsTemplates.emailSettings(user.emails, updatedUser),
                    ).build(),
                FJSC.button(<ButtonConfig>{
                    disabled: saveDisabled,
                    classes: ["positive"],
                    text: "Save changes",
                    icon: {icon: "save"},
                    onclick: async () => {
                        if (await LydaApi.updateUser(updatedUser.value)) {
                            user = {...user, ...updatedUser.value};
                            currentUser.value = await Util.getUserAsync(null, false);
                            reload();
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

    static qualitySelector(value: StreamingQuality, currentValue$: Signal<StreamingQuality>, actualValue$: Signal<StreamingQuality>) {
        const active$ = compute(c => c === value ? "active" : "_", actualValue$);
        const disabled$ = compute(u => value === StreamingQuality.high && (!u || !u.subscription), currentUser);

        return FJSC.button(<ButtonConfig>{
            classes: [active$, `quality-selector-${value}`, value === StreamingQuality.high ? "special" : "_"],
            text: value.toUpperCase(),
            disabled: disabled$,
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
        const actualValue = compute((u, v) => {
            if (!u || !u.subscription) {
                if (v === StreamingQuality.high) {
                    return StreamingQuality.medium;
                }
            }
            return v;
        }, currentUser, currentValue$);
        const noSubscription = compute(u => !u || !u.subscription, currentUser);

        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Streaming quality")
                    .build(),
                ifjs(noSubscription, create("div")
                    .classes("text", "text-small", "color-dim")
                    .text("High quality is only available with a subscription.")
                    .build()),
                create("div")
                    .classes("flex")
                    .children(
                        ...values.map(value => SettingsTemplates.qualitySelector(value, currentValue$, actualValue))
                    ).build()
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
                            icon: {icon: "delete"},
                            classes: ["negative"],
                            onclick: () => {
                                Ui.getConfirmationModal("Delete account", "Are you sure you want to delete your account? This action cannot be undone.",
                                    "Yes, delete my account", "No, keep account", async () => {
                                        LydaApi.deleteUser().then(res => {
                                            if (res.code === 200) {
                                                notify("Account deleted", NotificationType.success);
                                                navigate(RoutePath.login);
                                                window.location.reload();
                                            } else {
                                                notify("Account deletion failed", NotificationType.error);
                                            }
                                        })
                                    }, () => {
                                    }, "delete").then();
                            }
                        }),
                        FJSC.button({
                            text: "Download data",
                            icon: {icon: "download"},
                            onclick: () => {
                                LydaApi.exportUser().then(res => {
                                    if (res.code === 200) {
                                        const blob = new Blob([JSON.stringify(res.data)], {type: 'application/octet-stream'});
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
                    ).build(),
                GenericTemplates.inlineLink(() => navigate(RoutePath.roadmap), "Roadmap"),
                GenericTemplates.inlineLink(() => window.open("https://github.com/targoninc/lyda-ui-web-js", "_blank"), "Source code"),
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

    private static emailSettings(emails: UserEmail[], updatedUser: Signal<Partial<User>>) {
        const emails$ = signal<UserEmail[]>(emails);
        emails$.subscribe(emails => {
            updatedUser.value = {...updatedUser.value, emails};
        });
        const primaryEmailIndex = signal(emails.findIndex(e => e.primary));
        primaryEmailIndex.subscribe(index => {
            emails$.value = emails$.value.map((e, i) => {
                e.primary = i === index;
                return e;
            });
        });

        return create("div")
            .classes("flex-v")
            .children(
                create("h2")
                    .classes("flex")
                    .children(
                        GenericTemplates.icon("email", true),
                        create("h2")
                            .text("E-Mail settings")
                            .build(),
                    ).build(),
                signalMap(emails$, create("div").classes("flex-v", "card", "secondary"), (email, index) => SettingsTemplates.emailSetting(email, signal(index), primaryEmailIndex, emails$)),
                FJSC.button({
                    text: "Add E-Mail",
                    icon: {icon: "add"},
                    classes: ["positive"],
                    onclick: async () => {
                        emails$.value = [
                            ...emails$.value,
                            <UserEmail>{
                                email: "",
                                primary: false,
                                verified: false,
                                verified_at: null
                            }
                        ];
                    },
                })
            ).build();
    }

    private static emailSetting(email: UserEmail, index: Signal<number>, primaryEmailIndex: Signal<number>, emails$: Signal<UserEmail[]>) {
        const activationTimedOut = signal(false);
        const isPrimary = compute((i, i2) => i === i2, primaryEmailIndex, index);

        return create("div")
            .classes("flex-v")
            .children(
                FJSC.input(<InputConfig<string>>{
                    type: InputType.email,
                    name: "email",
                    required: true,
                    value: email.email,
                    onchange: v => {
                        emails$.value = emails$.value.map((e, i) => {
                            if (i === index.value) {
                                e.email = v;
                            }
                            return e;
                        });
                    }
                }),
                create("div")
                    .classes("flex", "align-children")
                    .children(
                        FJSC.toggle({
                            text: "Primary",
                            checked: isPrimary,
                            disabled: emails$.value.length === 1,
                            title: emails$.value.length === 1 ? "At least one email is required to be primary" : "",
                            onchange: v => {
                                if (emails$.value.length === 1) {
                                    primaryEmailIndex.value = 0;
                                    return;
                                }
                                if (v) {
                                    primaryEmailIndex.value = index.value;
                                } else {
                                    primaryEmailIndex.value = 0;
                                }
                            }
                        }),
                        ifjs(email.verified, create("div")
                            .classes("flex", "noflexwrap", "small-gap")
                            .children(
                                FJSC.icon({
                                    icon: "new_releases",
                                    adaptive: true,
                                    classes: ["text-positive"],
                                }),
                                create("span")
                                    .classes("text-positive")
                                    .text("Verified on " + Util.formatDate(email.verified_at ?? new Date()))
                                    .build()
                            ).build()),
                        ifjs(email.verified || email.email === "", FJSC.button({
                            icon: {icon: "verified_user"},
                            text: "Verify",
                            classes: ["positive"],
                            disabled: activationTimedOut,
                            onclick: async () => {
                                await AuthApi.sendActivationEmail();
                                activationTimedOut.value = true;
                                const interval = setInterval(async () => {
                                    const user = await Util.getUserAsync(null, false);
                                    if (user) {
                                        if (user.emails.some((e: UserEmail) => e.email === email.email && e.verified)) {
                                            clearInterval(interval);
                                            activationTimedOut.value = false;
                                            currentUser.value = user;
                                            reload();
                                        }
                                    }
                                }, 10 * 1000);

                                setTimeout(() => {
                                    activationTimedOut.value = false;
                                }, 60 * 1000);
                            }
                        }), true),
                        ifjs(email.verified, create("div")
                            .classes("flex", "noflexwrap", "small-gap")
                            .children(
                                FJSC.icon({
                                    icon: "warning",
                                    adaptive: true,
                                    classes: ["warning"],
                                }),
                                create("span")
                                    .classes("warning")
                                    .text("Not verified")
                                    .build()
                            ).build(), true),
                        ifjs(activationTimedOut, create("span")
                            .classes("text-positive")
                            .text("E-Mail sent, check your inbox and click the link to verify this address.")
                            .build()),
                        ifjs(email.primary, FJSC.button({
                            text: "Delete",
                            icon: {icon: "delete"},
                            classes: ["negative"],
                            onclick: async () => {
                                await Ui.getConfirmationModal("Delete email", "Are you sure you want to delete this email? This can't be undone.", "Yes", "No", async () => {
                                    emails$.value = emails$.value.filter((e, i) => i !== index.value);
                                }, () => {
                                }, "delete");
                            }
                        }), true),
                    ).build(),
            ).build();
    }
}