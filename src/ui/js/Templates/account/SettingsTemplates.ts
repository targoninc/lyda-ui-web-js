import {UserActions} from "../../Actions/UserActions.ts";
import {GenericTemplates, horizontal} from "../generic/GenericTemplates.ts";
import {getUserSettingValue, Util} from "../../Classes/Util.ts";
import {notify, Ui} from "../../Classes/Ui.ts";
import {Api} from "../../Api/Api.ts";
import {create, when, signalMap, compute, Signal, signal, InputType, nullElement} from "@targoninc/jess";
import {navigate, reload} from "../../Routing/Router.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {currentUser, permissions} from "../../state.ts";
import {AuthApi} from "../../Api/AuthApi.ts";
import {RoutePath} from "../../Routing/routes.ts";
import {
    button,
    ButtonConfig,
    icon,
    input,
    InputConfig,
    textarea,
    TextareaConfig,
    toggle
} from "@targoninc/jess-components";
import {Theme} from "@targoninc/lyda-shared/src/Enums/Theme";
import {UserSettings} from "@targoninc/lyda-shared/src/Enums/UserSettings";
import {StreamingQuality} from "@targoninc/lyda-shared/src/Enums/StreamingQuality";
import {Permission} from "@targoninc/lyda-shared/src/Models/db/lyda/Permission";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {UserEmail} from "@targoninc/lyda-shared/src/Models/db/lyda/UserEmail";
import {NotificationType} from "../../Enums/NotificationType.ts";

export class SettingsTemplates {
    static settingsPage() {
        const user = currentUser.value;
        if (!user) {
            navigate(RoutePath.login);
            return nullElement();
        }

        return create("div")
            .classes("flex-v")
            .children(
                create("h1")
                    .text("Settings")
                    .build(),
                SettingsTemplates.accountSection(user),
                SettingsTemplates.mfaSection(user),
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
        if (!hasAnyPermissions.value) {

        }

        return create("div")
            .children(
                when(hasAnyPermissions, create("div")
                    .classes("card", "flex-v")
                    .children(
                        create("h2")
                            .text("My Permissions")
                            .build(),
                        button({
                            text: "Go to Administration",
                            icon: {icon: "terminal"},
                            onclick: () => navigate(RoutePath.admin)
                        }),
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
            return !keys.some(k => u[k] !== user[k as keyof User]);
        }, updatedUser);

        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Account")
                    .build(),
                GenericTemplates.logoutButton(),
                create("p")
                    .text("Change your account settings here.")
                    .build(),
                when(user.subscription, button({
                    icon: {icon: "payments"},
                    text: "Manage subscription",
                    classes: ["positive"],
                    onclick: () => navigate(RoutePath.subscribe)
                })),
                when(user.subscription, button({
                    icon: {icon: "payments"},
                    text: "Subscribe for more features",
                    classes: ["special"],
                    onclick: () => navigate(RoutePath.subscribe)
                }), true),
                SettingsTemplates.userImageSettings(user),
                create("div")
                    .classes("flex-v", "small-card")
                    .children(
                        input(<InputConfig<string>>{
                            type: InputType.text,
                            label: "Username",
                            name: "username",
                            required: true,
                            value: user.username,
                            onchange: v => {
                                updatedUser.value = {...updatedUser.value, username: v};
                            }
                        }),
                        input(<InputConfig<string>>{
                            type: InputType.text,
                            label: "Display name",
                            name: "displayname",
                            required: true,
                            value: user.displayname,
                            onchange: v => {
                                updatedUser.value = {...updatedUser.value, displayname: v};
                            }
                        }),
                        textarea(<TextareaConfig>{
                            label: "Description",
                            name: "description",
                            value: user.description,
                            onchange: v => {
                                updatedUser.value = {...updatedUser.value, description: v};
                            }
                        }),
                        SettingsTemplates.emailSettings(user.emails, updatedUser),
                    ).build(),
                button(<ButtonConfig>{
                    disabled: saveDisabled,
                    classes: ["positive"],
                    text: "Save changes",
                    icon: {icon: "save"},
                    onclick: async () => {
                        if (await Api.updateUser(updatedUser.value)) {
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

    static qualitySelector(value: StreamingQuality, currentValue$: Signal<StreamingQuality>, actualValue$: Signal<StreamingQuality>) {
        const active$ = compute(c => c === value ? "active" : "_", actualValue$);
        const disabled$ = compute(u => value !== StreamingQuality.low && (!u || !u.subscription), currentUser);
        const textMap: Record<StreamingQuality, string> = {
            [StreamingQuality.low]: "low (92kbps)",
            [StreamingQuality.medium]: "medium (128kbps)",
            [StreamingQuality.high]: "high (320kbps)",
        };

        return horizontal(
            button(<ButtonConfig>{
                classes: [active$, `quality-selector-${value}`, value !== StreamingQuality.low ? "special" : "_"],
                text: textMap[value],
                disabled: disabled$,
                onclick: async () => {
                    currentValue$.value = value;
                    await UserActions.setStreamingQuality(value);
                }
            }),
        ).classes("align-children");
    }

    static themeSection(currentTheme: Theme) {
        const themes = Object.values(Theme);
        const currentTheme$ = signal(currentTheme);
        return create("div")
            .classes("card", "flex-v")
            .children(
                create("h2")
                    .text("Interface theme")
                    .build(),
                GenericTemplates.combinedSelector(themes, async (newIndex: number) => {
                    currentTheme$.value = themes[newIndex];
                    await UserActions.setTheme(currentTheme$.value);
                }, themes.indexOf(currentTheme$.value)),
            ).build();
    }

    static qualitySection(currentValue: StreamingQuality) {
        const values = Object.values(StreamingQuality);
        const currentValue$ = signal(currentValue);
        const actualValue = compute((u, v) => {
            if (!u || !u.subscription) {
                if (v !== StreamingQuality.low) {
                    return StreamingQuality.low;
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
                when(noSubscription, create("div")
                    .classes("text", "text-small", "color-dim")
                    .text("Medium and high qualities are only available with a subscription.")
                    .build()),
                when(noSubscription, GenericTemplates.inlineLink(() => navigate(RoutePath.subscribe), "Subscribe for higher quality")),
                create("div")
                    .classes("flex", "small-gap")
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
                    .text("Other")
                    .build(),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: "Delete account",
                            icon: {icon: "delete"},
                            classes: ["negative"],
                            onclick: () => {
                                Ui.getConfirmationModal("Delete account", "Are you sure you want to delete your account? This action cannot be undone.",
                                    "Yes, delete my account", "No, keep account", async () => {
                                        Api.deleteUser().then(res => {
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
                        button({
                            text: "Download data",
                            icon: {icon: "download"},
                            onclick: () => {
                                Api.exportUser().then(res => {
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
                button({
                    text: "Add E-Mail",
                    icon: {icon: "add"},
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
                input(<InputConfig<string>>{
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
                        toggle({
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
                        when(email.verified, create("div")
                            .classes("flex", "noflexwrap", "small-gap")
                            .children(
                                icon({
                                    icon: "new_releases",
                                    adaptive: true,
                                    classes: ["text-positive"],
                                }),
                                create("span")
                                    .classes("text-positive")
                                    .text("Verified on " + Util.formatDate(email.verified_at ?? new Date()))
                                    .build()
                            ).build()),
                        when(email.verified || email.email === "", button({
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
                        when(email.verified, create("div")
                            .classes("flex", "noflexwrap", "small-gap")
                            .children(
                                icon({
                                    icon: "warning",
                                    adaptive: true,
                                    classes: ["warning"],
                                }),
                                create("span")
                                    .classes("warning")
                                    .text("Not verified")
                                    .build()
                            ).build(), true),
                        when(activationTimedOut, create("span")
                            .classes("text-positive")
                            .text("E-Mail sent, check your inbox and click the link to verify this address.")
                            .build()),
                        when(email.primary, button({
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

    private static mfaSection(user: User) {
        return nullElement();
    }
}