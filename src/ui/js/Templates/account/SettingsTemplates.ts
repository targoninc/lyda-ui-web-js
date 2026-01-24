import { UserActions } from "../../Actions/UserActions.ts";
import { GenericTemplates, horizontal } from "../generic/GenericTemplates.ts";
import { copy, getUserSettingValue, Util } from "../../Classes/Util.ts";
import { createModal, notify, Ui } from "../../Classes/Ui.ts";
import { Api } from "../../Api/Api.ts";
import {
    compute,
    create,
    InputType,
    nullElement,
    Signal,
    signal,
    signalMap,
    StringOrSignal,
    when,
} from "@targoninc/jess";
import { navigate, reload, Route } from "../../Routing/Router.ts";
import { UserTemplates } from "./UserTemplates.ts";
import { currentUser, permissions } from "../../state.ts";
import { RoutePath } from "../../Routing/routes.ts";
import {
    button,
    ButtonConfig,
    heading,
    icon,
    input,
    InputConfig,
    select,
    textarea,
    TextareaConfig,
    toggle,
} from "@targoninc/jess-components";
import { Theme } from "@targoninc/lyda-shared/src/Enums/Theme";
import { UserSettings } from "@targoninc/lyda-shared/src/Enums/UserSettings";
import { StreamingQuality } from "@targoninc/lyda-shared/src/Enums/StreamingQuality";
import { Permission } from "@targoninc/lyda-shared/src/Models/db/lyda/Permission";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { UserEmail } from "@targoninc/lyda-shared/src/Models/db/lyda/UserEmail";
import { NotificationType } from "../../Enums/NotificationType.ts";
import { TotpTemplates } from "./TotpTemplates.ts";
import { WebauthnTemplates } from "./WebauthnTemplates.ts";
import { Language, language, LanguageOptions, t } from "../../../locales";
import { debounce } from "../../Classes/Helpers/Debounce.ts";

export class SettingsTemplates {
    static settingsPage(route: Route, params: Record<string, string>) {
        const user = currentUser.value;
        if (!user) {
            navigate(RoutePath.login);
            return nullElement();
        }

        const url = new URL(window.location.href);
        if (url.hash.length > 0) {
            const scrollTo = url.hash.substring(1);
            setTimeout(() => {
                const heading = document.querySelector(`h1[id="${scrollTo}"]`);
                if (heading) {
                    heading.scrollIntoView({
                        behavior: "smooth",
                    });
                }
            }, 100);
        }

        return create("div")
            .classes("flex-v")
            .children(
                heading({
                    level: 1,
                    text: t("SETTINGS"),
                }),
                SettingsTemplates.accountSection(user),
                SettingsTemplates.totpSection(),
                WebauthnTemplates.devicesSection(),
                SettingsTemplates.paymentSection(),
                SettingsTemplates.themeSection(getUserSettingValue<Theme>(user, UserSettings.theme)),
                SettingsTemplates.languageSection(),
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
                when(
                    hasAnyPermissions,
                    create("div")
                        .classes("card", "flex-v")
                        .children(
                            SettingsTemplates.sectionHeading(t("MY_PERMISSIONS")),
                            button({
                                text: t("GO_TO_ADMINISTRATION"),
                                icon: { icon: "terminal" },
                                onclick: () => navigate(RoutePath.admin),
                            }),
                            signalMap(
                                permissions,
                                create("div").classes("flex-v"),
                                (permission: Permission) =>
                                    SettingsTemplates.permissionCard(permission),
                            ),
                        ).build(),
                ),
            ).build();
    }

    static permissionCard(permission: Permission) {
        return create("div").children(create("span").text(permission.name).build()).build();
    }

    static accountSection(user: User) {
        const updatedUser$ = signal<Partial<User>>({});
        const emails$ = signal<UserEmail[]>(user.emails ?? []);
        const saveDisabled = compute((u: Record<string, any>, e: UserEmail[]) => {
            const keys = Object.keys(u);
            return !keys.some(k => u[k] !== user[k as keyof User]) && JSON.stringify(e) === JSON.stringify(user.emails);
        }, updatedUser$, emails$);

        return create("div")
            .classes("card", "flex-v")
            .children(
                SettingsTemplates.sectionHeading(t("ACCOUNT")),
                GenericTemplates.logoutButton(),
                create("p")
                    .text(t("CHANGE_ACCOUNT_SETTINGS"))
                    .build(),
                when(
                    user.subscription,
                    button({
                        icon: { icon: "payments" },
                        text: t("MANAGE_SUBSCRIPTION"),
                        classes: ["positive"],
                        onclick: () => navigate(RoutePath.subscribe),
                    }),
                ),
                when(
                    user.subscription,
                    button({
                        icon: { icon: "payments" },
                        text: t("SUBSCRIBE_MORE_FEATURES"),
                        classes: ["special", "bigger-input", "rounded-max"],
                        onclick: () => navigate(RoutePath.subscribe),
                    }),
                    true,
                ),
                SettingsTemplates.userImageSettings(user),
                create("div")
                    .classes("flex-v", "small-card")
                    .children(
                        input(<InputConfig<string>>{
                            type: InputType.text,
                            label: t("USERNAME"),
                            name: "username",
                            required: true,
                            value: compute(uu => uu.username ?? user.username, updatedUser$),
                            onchange: v => {
                                updatedUser$.value = { ...updatedUser$.value, username: v };
                            },
                        }),
                        input(<InputConfig<string>>{
                            type: InputType.text,
                            label: t("DISPLAY_NAME"),
                            name: "displayname",
                            required: true,
                            value: compute(uu => uu.displayname ?? user.displayname, updatedUser$),
                            onchange: v => {
                                updatedUser$.value = { ...updatedUser$.value, displayname: v };
                            },
                        }),
                        textarea(<TextareaConfig>{
                            label: t("DESCRIPTION"),
                            name: "description",
                            value: compute(uu => uu.description ?? user.description, updatedUser$),
                            onchange: v => {
                                updatedUser$.value = { ...updatedUser$.value, description: v };
                            },
                        }),
                        SettingsTemplates.emailSettings(emails$),
                    ).build(),
                horizontal(
                    button(<ButtonConfig>{
                        disabled: saveDisabled,
                        classes: ["positive"],
                        text: t("SAVE_CHANGES"),
                        icon: { icon: "save" },
                        onclick: async () => {
                            if (await Api.updateUser({
                                ...updatedUser$.value,
                                emails: emails$.value,
                            })) {
                                user = { ...user, ...updatedUser$.value };
                                currentUser.value = await Util.getUserAsync(null, false);
                                reload();
                            }
                        },
                    }),
                    when(saveDisabled, horizontal(
                        button(<ButtonConfig>{
                            text: t("REVERT"),
                            icon: { icon: "undo" },
                            onclick: () => {
                                emails$.value = user.emails ?? [];
                                updatedUser$.value = {};
                            },
                        }),
                        create("span")
                            .classes("warning", "text-small")
                            .text(t("UNSAVED_CHANGES"))
                    ).classes("align-children").build(), true)
                )
            ).build();
    }

    static notificationsSection(user: User) {
        return create("div")
            .classes("card", "flex-v")
            .children(
                SettingsTemplates.sectionHeading(t("EMAIL_NOTIFICATIONS")),
                SettingsTemplates.notificationToggle(
                    t("NOTIFS_LIKE"),
                    "like",
                    getUserSettingValue(user, UserSettings.notificationLike),
                ),
                SettingsTemplates.notificationToggle(
                    t("NOTIFS_COMMENT"),
                    "comment",
                    getUserSettingValue(user, UserSettings.notificationComment),
                ),
                SettingsTemplates.notificationToggle(
                    t("NOTIFS_REPLIES"),
                    "reply",
                    getUserSettingValue(user, UserSettings.notificationReply),
                ),
                SettingsTemplates.notificationToggle(
                    t("NOTIFS_FOLLOW"),
                    "follow",
                    getUserSettingValue(user, UserSettings.notificationFollow),
                ),
                SettingsTemplates.notificationToggle(
                    t("NOTIFS_REPOST"),
                    "repost",
                    getUserSettingValue(user, UserSettings.notificationRepost),
                ),
                SettingsTemplates.notificationToggle(
                    t("NOTIFS_COLLAB"),
                    "collaboration",
                    getUserSettingValue(user, UserSettings.notificationCollaboration),
                ),
                SettingsTemplates.notificationToggle(
                    t("NOTIFS_SALE"),
                    "sale",
                    getUserSettingValue(user, UserSettings.notificationSale),
                ),
            ).build();
    }

    static notificationToggle(text: StringOrSignal, key: string, currentValue: boolean) {
        return GenericTemplates.toggle(text, "notification_" + key, async () =>
            await UserActions.toggleNotificationSetting(key), [], currentValue);
    }

    static behaviourSection(user: User) {
        return create("div")
            .classes("card", "flex-v")
            .children(
                SettingsTemplates.sectionHeading(t("BEHAVIOUR")),
                SettingsTemplates.playFromAutoQueueToggle(
                    getUserSettingValue(user, UserSettings.playFromAutoQueue),
                ),
                SettingsTemplates.publicLikesToggle(
                    getUserSettingValue(user, UserSettings.publicLikes),
                ),
            ).build();
    }

    static qualitySelector(
        value: StreamingQuality,
        currentValue$: Signal<StreamingQuality>,
        actualValue$: Signal<StreamingQuality>,
    ) {
        const active$ = compute(c => (c === value ? "active" : "_"), actualValue$);
        const disabled$ = compute(
            u => value !== StreamingQuality.low && (!u || !u.subscription),
            currentUser,
        );
        const textMap: Record<StreamingQuality, StringOrSignal> = {
            [StreamingQuality.low]: t("QUALITY_LOW"),
            [StreamingQuality.medium]: t("QUALITY_MEDIUM"),
            [StreamingQuality.high]: t("QUALITY_HIGH"),
        };

        return horizontal(
            button(<ButtonConfig>{
                classes: [
                    active$,
                    `quality-selector-${value}`,
                    value !== StreamingQuality.low ? "special" : "_",
                ],
                text: textMap[value],
                disabled: disabled$,
                onclick: async () => {
                    currentValue$.value = value;
                    await UserActions.setStreamingQuality(value);
                },
            }),
        ).classes("align-children");
    }

    static themeSection(currentTheme: Theme) {
        const themes = Object.values(Theme);
        const currentTheme$ = signal(currentTheme);

        return create("div")
            .classes("card", "flex-v")
            .children(
                SettingsTemplates.sectionHeading(t("UI_THEME")),
                GenericTemplates.combinedSelector(
                    themes,
                    async (newIndex: number) => {
                        currentTheme$.value = themes[newIndex];
                        await UserActions.setTheme(currentTheme$.value);
                    },
                    themes.indexOf(currentTheme$.value),
                ),
            ).build();
    }

    static languageSection() {
        return create("div")
            .classes("card", "flex-v")
            .children(
                SettingsTemplates.sectionHeading(t("LANGUAGE")),
                select({
                    options: signal(LanguageOptions),
                    value: language,
                    onchange: value => language.value = value as Language,
                }),
            ).build();
    }

    static qualitySection(currentValue: StreamingQuality) {
        const values = Object.values(StreamingQuality);
        const currentValue$ = signal(currentValue);
        const actualValue = compute(
            (u, v) => {
                if (!u || !u.subscription) {
                    if (v !== StreamingQuality.low) {
                        return StreamingQuality.low;
                    }
                }
                return v;
            },
            currentUser,
            currentValue$,
        );
        const noSubscription = compute(u => !u || !u.subscription, currentUser);

        return create("div")
            .classes("card", "flex-v")
            .children(
                SettingsTemplates.sectionHeading(t("STREAMING_QUALITY")),
                when(noSubscription,
                    create("div")
                        .classes("text", "text-small", "color-dim")
                        .text(t("MEDIUM_HIGH_ONLY_SUBSCRIPTION"))
                        .build()),
                when(noSubscription, GenericTemplates.inlineLink(() => navigate(RoutePath.subscribe), t("SUBSCRIBE_FOR_HIGHER_QUALITY"))),
                create("div")
                    .classes("flex", "small-gap")
                    .children(
                        ...values.map(value =>
                            SettingsTemplates.qualitySelector(value, currentValue$, actualValue),
                        ),
                    ).build(),
            ).build();
    }

    static playFromAutoQueueToggle(currentValue: boolean) {
        return GenericTemplates.toggle(
            t("PLAY_FROM_AUTO_QUEUE"),
            UserSettings.playFromAutoQueue,
            async () => {
                await UserActions.togglePlayFromAutoQueue();
            }, [], currentValue,
        );
    }

    static publicLikesToggle(currentValue: boolean) {
        return GenericTemplates.toggle(
            t("MAKE_LIBRARY_PUBLIC"),
            UserSettings.publicLikes,
            async () => {
                await UserActions.togglePublicLikes();
            }, [], currentValue,
        );
    }

    private static dangerSection(user: User) {
        return create("div")
            .classes("card", "flex-v")
            .children(
                SettingsTemplates.sectionHeading(t("OTHER")),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: t("DELETE_ACCOUNT"),
                            icon: { icon: "delete" },
                            classes: ["negative"],
                            onclick: () => {
                                Ui.getConfirmationModal(
                                    t("DELETE_ACCOUNT"),
                                    t("DELETE_ACCOUNT_SURE"),
                                    t("YES_DELETE_ACCOUNT"),
                                    t("NO_KEEP_ACCOUNT"),
                                    async () => {
                                        Api.deleteUser().then(() => {
                                            notify(t("ACCOUNT_DELETED"), NotificationType.success);
                                            navigate(RoutePath.login);
                                            window.location.reload();
                                        });
                                    },
                                    () => {
                                    },
                                    "delete",
                                ).then();
                            },
                        }),
                        button({
                            text: t("DOWNLOAD_DATA"),
                            icon: { icon: "download" },
                            onclick: () => {
                                Api.exportUser().then(res => {
                                    const blob = new Blob([JSON.stringify(res)], {
                                        type: "application/octet-stream",
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `userdata-${user.username}.json`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                });
                            },
                        }),
                    )
                    .build(),
            ).build();
    }

    private static linksSection() {
        return create("div")
            .classes("card", "flex-v")
            .children(
                SettingsTemplates.sectionHeading(t("LINKS")),
                create("div")
                    .classes("flex")
                    .children(
                        GenericTemplates.gif8831(
                            "/img/88x31/targoninc.gif",
                            "https://targoninc.com",
                        ),
                        GenericTemplates.gif8831(
                            "/img/88x31/firefox.gif",
                            "https://www.mozilla.org/en-US/firefox/new/",
                        ),
                        GenericTemplates.gif8831(
                            "/img/88x31/discord.gif",
                            "https://discord.gg/QeNU8b7Hbb",
                        ),
                        GenericTemplates.gif8831("/img/88x31/ubuntu.gif", "https://ubuntu.com/"),
                        GenericTemplates.gif8831(
                            "/img/88x31/hetzner.gif",
                            "https://www.hetzner.com/",
                        ),
                    )
                    .build(),
                GenericTemplates.inlineLink(() => navigate(RoutePath.roadmap), t("ROADMAP")),
                GenericTemplates.inlineLink(
                    () => window.open("https://github.com/targoninc/lyda-ui-web-js", "_blank"),
                    t("SOURCE_CODE"),
                ),
            ).build();
    }

    private static userImageSettings(user: User) {
        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "card", "small-card", "secondary")
                    .children(
                        create("span").text(t("AVATAR")).build(),
                        UserTemplates.avatarDeleteButton(user),
                        UserTemplates.avatarReplaceButton(user),
                    ).build(),
                create("div")
                    .classes("flex", "card", "small-card", "secondary")
                    .children(
                        create("span").text(t("BANNER")).build(),
                        UserTemplates.bannerDeleteButton(user),
                        UserTemplates.bannerReplaceButton(user),
                    ).build(),
            ).build();
    }

    private static emailSettings(emails$: Signal<UserEmail[]>) {
        const primaryEmailIndex = signal(emails$.value.findIndex(e => e.primary));
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
                        create("span").text(t("EMAIL_SETTINGS")),
                    ).build(),
                signalMap(
                    emails$,
                    create("div").classes("flex-v", "card", "secondary"),
                    (email, index) =>
                        SettingsTemplates.emailSetting(
                            email,
                            signal(index),
                            primaryEmailIndex,
                            emails$,
                        ),
                ),
                button({
                    text: t("ADD_EMAIL"),
                    icon: { icon: "add" },
                    onclick: async () => {
                        emails$.value = [
                            ...emails$.value,
                            <UserEmail>{
                                email: "",
                                primary: false,
                                verified: false,
                                verified_at: null,
                            },
                        ];
                    },
                }),
            ).build();
    }

    private static emailSetting(
        email: UserEmail,
        index: Signal<number>,
        primaryEmailIndex: Signal<number>,
        emails$: Signal<UserEmail[]>,
    ) {
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
                    id: `email-input-${index.value}`,
                    debounce: 500,
                    onchange: v => {
                        emails$.value = emails$.value.map((e, i) => {
                            if (i === index.value) {
                                e.email = v;
                            }
                            return e;
                        });
                        document.getElementById(`email-input-${index.value}`)?.focus();
                    },
                }),
                create("div")
                    .classes("flex", "align-children")
                    .children(
                        toggle({
                            text: t("PRIMARY"),
                            checked: isPrimary,
                            disabled: emails$.value.length === 1,
                            title:
                                emails$.value.length === 1
                                    ? t("AT_LEAST_ONE_MAIL_REQUIRED_PRIMARY")
                                    : "",
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
                            },
                        }),
                        when(email.verified, GenericTemplates.verifiedWithDate(email.verified_at ?? new Date())),
                        when(
                            email.verified || email.email === "",
                            button({
                                icon: { icon: "verified_user" },
                                text: t("VERIFY"),
                                classes: ["positive"],
                                disabled: activationTimedOut,
                                onclick: async () => {
                                    await Api.sendActivationEmail();
                                    activationTimedOut.value = true;
                                    const interval = setInterval(async () => {
                                        const user = await Util.getUserAsync(null, false);
                                        if (user) {
                                            if (
                                                user.emails.some(
                                                    (e: UserEmail) =>
                                                        e.email === email.email && e.verified,
                                                )
                                            ) {
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
                                },
                            }),
                            true,
                        ),
                        when(
                            email.verified,
                            create("div")
                                .classes("flex", "noflexwrap", "small-gap")
                                .children(
                                    icon({
                                        icon: "warning",
                                        adaptive: true,
                                        classes: ["warning"],
                                    }),
                                    create("span")
                                        .classes("warning")
                                        .text(t("NOT_VERIFIED"))
                                        .build(),
                                ).build(),
                            true,
                        ),
                        when(
                            activationTimedOut,
                            create("span")
                                .classes("text-positive")
                                .text(t("VERIFICATION_EMAIL_SENT")).build(),
                        ),
                        when(
                            email.primary,
                            button({
                                text: t("DELETE"),
                                icon: { icon: "delete" },
                                classes: ["negative"],
                                onclick: async () => {
                                    await Ui.getConfirmationModal(
                                        t("DELETE_EMAIL"),
                                        t("DELETE_EMAIL_YOU_SURE"),
                                        t("YES"),
                                        t("NO"),
                                        async () => {
                                            emails$.value = emails$.value.filter(
                                                (e, i) => i !== index.value,
                                            );
                                        },
                                        () => {
                                        },
                                        "delete",
                                    );
                                },
                            }),
                            true,
                        ),
                    ).build(),
            ).build();
    }

    private static totpSection() {
        const totpMethods = compute(u => u?.totp ?? [], currentUser);
        const userId = compute(u => u?.id, currentUser);
        const hasMethods = compute(m => m.length > 0, totpMethods);
        const loading = signal(false);

        return create("div")
            .classes("flex-v", "card")
            .children(
                SettingsTemplates.sectionHeading(t("TOTP_DEVICES")),
                when(
                    hasMethods,
                    create("span").text(t("NO_TOTP_CONFIGURED")).build(),
                    true,
                ),
                when(hasMethods, TotpTemplates.totpDevices(totpMethods, loading, userId)),
                button({
                    text: t("ADD_TOTP"),
                    icon: { icon: "add" },
                    classes: ["positive", "fit-content"],
                    onclick: async () => {
                        await Ui.getTextInputModal(
                            t("TOTP_NAME"),
                            t("TOTP_NAME_DESCRIPTION"),
                            "",
                            t("ADD"),
                            t("CANCEL"),
                            async (name: string) => {
                                loading.value = true;
                                await Api.addTotpMethod(name)
                                    .then(res => {
                                        if (!res) {
                                            return;
                                        }
                                        Api.getUserById().then(u => {
                                            currentUser.value = u;
                                        });
                                        createModal(
                                            [
                                                TotpTemplates.verifyTotpAddModal(res.secret, res.qrDataUrl),
                                            ],
                                            "add-modal-verify",
                                        );
                                    })
                                    .finally(() => (loading.value = false));
                            }, () => {
                            }, "qr_code",
                        );
                    },
                }),
            ).build();
    }

    static sectionHeading(text: Signal<string>) {
        const id = text.value.trim().replaceAll(/\s+/g, "-").toLowerCase();

        return horizontal(
            heading({
                level: 1,
                classes: ["bold"],
                text,
                id,
            }),
        ).onclick(async () => {
            const url = new URL(window.location.href);
            await copy(`${url.origin}${url.pathname}#${id}`);
        });
    }

    private static paymentSection() {
        const loading = signal(false);
        const user = currentUser.value;
        if (!user) {
            return create("div").build();
        }

        return create("div")
            .classes("flex-v", "card")
            .children(
                SettingsTemplates.sectionHeading(t("PAYMENT_INFO")),
                input<string>({
                    type: InputType.text,
                    name: "paypalMail",
                    label: "PayPal account E-Mail address",
                    value: getUserSettingValue(user, UserSettings.paypalMail),
                    onchange: value => {
                        debounce("paypalMail", () => {
                            loading.value = true;
                            Api.updateUserSetting(UserSettings.paypalMail, value)
                                .finally(() => loading.value = false);
                        }, 1000);
                    },
                }),
            );
    }
}