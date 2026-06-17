import {UserActions} from "../../Actions/UserActions.ts";
import {GenericTemplates, horizontal, vertical} from "../generic/GenericTemplates.ts";
import {copy, getUserSettingValue, Util} from "../../Classes/Util.ts";
import {createModal, notify, Ui} from "../../Classes/Ui.ts";
import {Api} from "../../Api/Api.ts";
import {
    asSignal,
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
import {navigate, reload} from "../../Routing/Router.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {currentUser, permissions} from "../../state.ts";
import {RoutePath} from "../../Routing/routes.ts";
import {
    button,
    ButtonConfig,
    error,
    heading,
    icon,
    input,
    InputConfig,
    select,
    textarea,
    TextareaConfig,
    toggle,
} from "@targoninc/jess-components";
import {Theme} from "@targoninc/lyda-shared/src/Enums/Theme";
import {UserSettings} from "@targoninc/lyda-shared/src/Enums/UserSettings";
import {StreamingQuality} from "@targoninc/lyda-shared/src/Enums/StreamingQuality";
import {Permission} from "@targoninc/lyda-shared/src/Models/db/lyda/Permission";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {UserEmail} from "@targoninc/lyda-shared/src/Models/db/lyda/UserEmail";
import {NotificationType} from "../../Enums/NotificationType.ts";
import {TotpTemplates} from "./TotpTemplates.ts";
import {WebauthnTemplates} from "./WebauthnTemplates.ts";
import {Language, language, LanguageOptions, t} from "../../../locales";
import {debounce} from "../../Classes/Helpers/Debounce.ts";
import {TextSize} from "../../Enums/TextSize.ts";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType.ts";
import {InteractionType} from "@targoninc/lyda-shared/src/Enums/InteractionType.ts";
import {UserTaxinfo} from "@targoninc/lyda-shared/src/Models/db/lyda/UserTaxinfo.ts";
import {SelectOption} from "@targoninc/jess-components/dist/jess-components/Types";
import {ProgressPart} from "../../Models/ProgressPart.ts";
import {ProgressState} from "@targoninc/lyda-shared/src/Enums/ProgressState";
import {Config} from "../../Classes/Config.ts";
import { StripeService } from "../../Services/StripeService.ts";

export class SettingsTemplates {
    private static sectionId(heading: Signal<string>) {
        return heading.value.trim().replaceAll(/\s+/g, "-").toLowerCase();
    }

    private static sectionIcons: Record<string, string> = {
        "account": "person",
        "totp-devices": "vpn_key",
        "passkeys": "fingerprint",
        "payment-info": "credit_card",
        "tax-info": "receipt_long",
        "interface-theme": "palette",
        "language": "translate",
        "streaming-quality": "edit_audio",
        "my-permissions": "admin_panel_settings",
        "behaviour": "tune",
        "e-mail-notifications": "notifications",
        "other": "more_horiz",
        "links": "link",
        "discography": "album",
    };

    static settingsPage() {
        const user = currentUser.value;
        if (!user) {
            navigate(RoutePath.login);
            return nullElement();
        }

        const searchQuery$ = signal("");
        const navButtonsExpanded = signal(false);

        const sectionConfigs: { heading: () => Signal<string>; id: string }[] = [
            {heading: () => t("ACCOUNT"), id: SettingsTemplates.sectionId(t("ACCOUNT"))},
            {heading: () => t("TOTP_DEVICES"), id: SettingsTemplates.sectionId(t("TOTP_DEVICES"))},
            {heading: () => t("PASSKEYS"), id: SettingsTemplates.sectionId(t("PASSKEYS"))},
            {heading: () => t("PAYMENT_INFO"), id: SettingsTemplates.sectionId(t("PAYMENT_INFO"))},
            {heading: () => t("TAX_INFO"), id: SettingsTemplates.sectionId(t("TAX_INFO"))},
            {heading: () => t("UI_THEME"), id: SettingsTemplates.sectionId(t("UI_THEME"))},
            {heading: () => t("LANGUAGE"), id: SettingsTemplates.sectionId(t("LANGUAGE"))},
            {heading: () => t("STREAMING_QUALITY"), id: SettingsTemplates.sectionId(t("STREAMING_QUALITY"))},
            {heading: () => t("MY_PERMISSIONS"), id: SettingsTemplates.sectionId(t("MY_PERMISSIONS"))},
            {heading: () => t("BEHAVIOUR"), id: SettingsTemplates.sectionId(t("BEHAVIOUR"))},
            {heading: () => t("EMAIL_NOTIFICATIONS"), id: SettingsTemplates.sectionId(t("EMAIL_NOTIFICATIONS"))},
            {heading: () => t("DISCOGRAPHY"), id: SettingsTemplates.sectionId(t("DISCOGRAPHY"))},
            {heading: () => t("OTHER"), id: SettingsTemplates.sectionId(t("OTHER"))},
            {heading: () => t("LINKS"), id: SettingsTemplates.sectionId(t("LINKS"))},
        ];

        const navButtons = sectionConfigs.map(({heading, id}) => {
            const text = heading();
            return button({
                text,
                icon: {icon: SettingsTemplates.sectionIcons[id] ?? "settings"},
                classes: ["rounded-max"],
                onclick: () => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.scrollIntoView({behavior: "smooth", block: "center"});
                    }
                },
            });
        });

        const fixedBar = GenericTemplates.fixedBar([
            create("div").classes("flex", "align-children", "small-gap", "flex-wrap").children(
                input({
                    type: InputType.text,
                    name: "search",
                    placeholder: t("SEARCH_SETTINGS"),
                    debounce: 200,
                    value: searchQuery$,
                    onchange: v => searchQuery$.value = v,
                }),
                button({
                    icon: {icon: compute((e): string => e ? "expand_more" : "chevron_right", navButtonsExpanded)},
                    classes: ["rounded-max"],
                    onclick: () => navButtonsExpanded.value = !navButtonsExpanded.value,
                }),
                when(navButtonsExpanded, create("div").classes("flex", "flex-wrap", "small-gap", "align-children").children(...navButtons).build()),
            ).build(),
        ]);

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

        const sectionWrapper = (id: string, ...children: any[]) =>
            create("div").id(id).children(...children).build();

        return vertical(
            heading({
                level: 1,
                text: t("SETTINGS"),
            }),
            fixedBar,
            vertical(
                sectionWrapper(sectionConfigs[0].id, SettingsTemplates.accountSection(user, searchQuery$)),
                sectionWrapper(sectionConfigs[1].id, SettingsTemplates.totpSection(searchQuery$)),
                sectionWrapper(sectionConfigs[2].id, WebauthnTemplates.devicesSection(searchQuery$)),
                sectionWrapper(sectionConfigs[3].id, SettingsTemplates.paymentSection(searchQuery$)),
                sectionWrapper(sectionConfigs[4].id, SettingsTemplates.taxinfoSection(searchQuery$)),
                sectionWrapper(sectionConfigs[5].id, SettingsTemplates.themeSection(getUserSettingValue<Theme>(user, UserSettings.theme), searchQuery$)),
                sectionWrapper(sectionConfigs[6].id, SettingsTemplates.languageSection(searchQuery$)),
                sectionWrapper(sectionConfigs[7].id, SettingsTemplates.qualitySection(getUserSettingValue<StreamingQuality>(user, UserSettings.streamingQuality) ?? "m", searchQuery$)),
                sectionWrapper(sectionConfigs[8].id, SettingsTemplates.permissionsSection(searchQuery$)),
                sectionWrapper(sectionConfigs[9].id, SettingsTemplates.behaviourSection(user, searchQuery$)),
                sectionWrapper(sectionConfigs[10].id, SettingsTemplates.notificationsSection(user, searchQuery$)),
                sectionWrapper(sectionConfigs[11].id, SettingsTemplates.discographySection(searchQuery$)),
                sectionWrapper(sectionConfigs[12].id, SettingsTemplates.dangerSection(user, searchQuery$)),
                sectionWrapper(sectionConfigs[13].id, SettingsTemplates.linksSection(searchQuery$)),
            ).build(),
        ).build();
    }

    static matches(text: StringOrSignal, query: string) {
        if (!query) {
            return true;
        }
        const t = (asSignal(text).value ?? "") as string;
        return t.toLowerCase().includes(query.toLowerCase());
    }

    static permissionsSection(searchQuery$: Signal<string>) {
        const hasAnyPermissions = compute(p => p.length > 0, permissions);
        const heading = t("MY_PERMISSIONS");
        const adminBtnText = t("GO_TO_ADMINISTRATION");

        return compute(query => {
            const headingMatches = SettingsTemplates.matches(heading, query);
            const btnMatches = SettingsTemplates.matches(adminBtnText, query);
            const matchingPermissions = permissions.value.filter(p => SettingsTemplates.matches(p.name, query));

            if (!headingMatches && !btnMatches && matchingPermissions.length === 0) {
                return nullElement();
            }

            return create("div")
                .children(
                    when(
                        hasAnyPermissions,
                        create("div")
                            .classes("card", "flex-v")
                            .children(
                                SettingsTemplates.sectionHeading(heading),
                                when(headingMatches || btnMatches, button({
                                    text: adminBtnText,
                                    icon: {icon: "terminal"},
                                    onclick: () => navigate(RoutePath.admin),
                                })),
                                ...matchingPermissions.map(p => SettingsTemplates.permissionCard(p)),
                            ).build(),
                    ),
                ).build();
        }, searchQuery$);
    }

    static permissionCard(permission: Permission) {
        return create("div")
            .classes("permission")
            .text(permission.name)
            .build();
    }

    static accountSection(user: User, searchQuery$: Signal<string>) {
        const heading = t("ACCOUNT");
        const updatedUser$ = signal<Partial<User>>({});
        const originalMails = structuredClone(user.emails ?? []);
        const emails$ = signal<UserEmail[]>(structuredClone(originalMails));
        const saveDisabled = compute((u: Record<string, any>, e: UserEmail[]) => {
            const keys = Object.keys(u);
            return !keys.some(k => u[k] !== user[k as keyof User]) && JSON.stringify(e) === JSON.stringify(originalMails);
        }, updatedUser$, emails$);
        const resetRequested = signal(false);
        const resetError = signal<null | string>(null);

        const requestPasswordResetText = t("REQUEST_PASSWORD_RESET");
        const manageSubText = t("MANAGE_SUBSCRIPTION");
        const subscribeMoreText = t("SUBSCRIBE_MORE_FEATURES");
        const usernameText = t("USERNAME");
        const displaynameText = t("DISPLAY_NAME");
        const descriptionText = t("DESCRIPTION");
        const emailSettingsText = t("EMAIL_SETTINGS");

        return compute(query => {
            const headingMatches = SettingsTemplates.matches(heading, query);

            const items = [
                {
                    match: headingMatches || SettingsTemplates.matches(requestPasswordResetText, query),
                    template: () => horizontal(
                        GenericTemplates.logoutButton(),
                        vertical(
                            button({
                                text: requestPasswordResetText,
                                icon: {
                                    icon: "lock_reset"
                                },
                                disabled: compute(r => !user.emails.some(e => e.verified || e.primary) || r, resetRequested),
                                onclick: async () => {
                                    try {
                                        await Api.requestPasswordReset();
                                        notify(
                                            `${t("PASSWORD_RESET_REQUESTED")}`,
                                            NotificationType.success,
                                        );
                                        resetRequested.value = true;
                                    } catch (error: any) {
                                        resetError.value = error.message;
                                    }
                                },
                            }),
                            when(resetRequested, create("span")
                                .classes("text-positive")
                                .text(t("PASSWORD_RESET_REQUESTED"))
                                .build()),
                            compute(e => e ? error(e) : nullElement(), resetError)
                        ),
                    )
                },
                {
                    match: headingMatches || SettingsTemplates.matches(t("CHANGE_ACCOUNT_SETTINGS"), query),
                    template: () => create("p")
                        .text(t("CHANGE_ACCOUNT_SETTINGS"))
                        .build()
                },
                {
                    match: (headingMatches || SettingsTemplates.matches(manageSubText, query)) && !!user.subscription,
                    template: () => button({
                        icon: {icon: "payments"},
                        text: manageSubText,
                        classes: ["positive"],
                        onclick: () => navigate(RoutePath.subscribe),
                    })
                },
                {
                    match: (headingMatches || SettingsTemplates.matches(subscribeMoreText, query)) && !user.subscription,
                    template: () => button({
                        icon: {icon: "payments"},
                        text: subscribeMoreText,
                        classes: ["special", "bigger-input", "rounded-max"],
                        onclick: () => navigate(RoutePath.subscribe),
                    })
                },
                {
                    match: headingMatches,
                    template: () => SettingsTemplates.userImageSettings(user)
                },
                {
                    match: headingMatches || SettingsTemplates.matches(usernameText, query),
                    template: () => input(<InputConfig<string>>{
                        type: InputType.text,
                        label: usernameText,
                        name: "username",
                        required: true,
                        value: compute(uu => uu.username ?? user.username, updatedUser$),
                        onchange: v => {
                            updatedUser$.value = {...updatedUser$.value, username: v.replace(/[^a-zA-Z0-9_-]/g, "")};
                        },
                    })
                },
                {
                    match: headingMatches || SettingsTemplates.matches(displaynameText, query),
                    template: () => input(<InputConfig<string>>{
                        type: InputType.text,
                        label: displaynameText,
                        name: "displayname",
                        required: true,
                        value: compute(uu => uu.displayname ?? user.displayname, updatedUser$),
                        onchange: v => {
                            updatedUser$.value = {...updatedUser$.value, displayname: v};
                        },
                    })
                },
                {
                    match: headingMatches || SettingsTemplates.matches(descriptionText, query),
                    template: () => textarea(<TextareaConfig>{
                        label: descriptionText,
                        name: "description",
                        value: compute(uu => uu.description ?? user.description, updatedUser$),
                        onchange: v => {
                            updatedUser$.value = {...updatedUser$.value, description: v};
                        },
                    })
                },
                {
                    match: headingMatches || SettingsTemplates.matches(emailSettingsText, query),
                    template: () => SettingsTemplates.emailSettings(emails$)
                }
            ];

            const matchingItems = items.filter(i => i.match);
            if (matchingItems.length === 0) return nullElement();

            return create("div")
                .classes("card", "flex-v")
                .children(
                    SettingsTemplates.sectionHeading(heading),
                    ...matchingItems.map(i => i.template()),
                    horizontal(
                        button(<ButtonConfig>{
                            disabled: saveDisabled,
                            classes: ["positive"],
                            text: t("SAVE_CHANGES"),
                            icon: {icon: "save"},
                            onclick: async () => {
                                if (await Api.updateUser({
                                    ...updatedUser$.value,
                                    emails: emails$.value,
                                })) {
                                    user = {...user, ...updatedUser$.value};
                                    currentUser.value = await Util.getUserAsync(null, false);
                                    reload();
                                }
                            },
                        }),
                        when(saveDisabled, horizontal(
                            button(<ButtonConfig>{
                                text: t("REVERT"),
                                icon: {icon: "undo"},
                                onclick: () => {
                                    emails$.value = originalMails;
                                    updatedUser$.value = {};
                                },
                            }),
                            create("span")
                                .classes("warning", TextSize.small)
                                .text(t("UNSAVED_CHANGES")),
                        ).classes("align-children").build(), true),
                    ).classes("align-children").build(),
                ).build();
        }, searchQuery$);
    }

    static notificationsSection(user: User, searchQuery$: Signal<string>) {
        const heading = t("EMAIL_NOTIFICATIONS");
        const items = [
            {text: t("NOTIFS_LIKE"), key: "like", value: UserSettings.notificationLike},
            {text: t("NOTIFS_COMMENT"), key: "comment", value: UserSettings.notificationComment},
            {text: t("NOTIFS_REPLIES"), key: "reply", value: UserSettings.notificationReply},
            {text: t("NOTIFS_FOLLOW"), key: "follow", value: UserSettings.notificationFollow},
            {text: t("NOTIFS_REPOST"), key: "repost", value: UserSettings.notificationRepost},
            {text: t("NOTIFS_COLLAB"), key: "collaboration", value: UserSettings.notificationCollaboration},
            {text: t("NOTIFS_SALE"), key: "sale", value: UserSettings.notificationSale},
            {text: t("NOTIFS_TRACK_DELETED"), key: "track_deleted", value: UserSettings.notificationTrackDeleted},
        ];

        return compute(query => {
            const headingMatches = SettingsTemplates.matches(heading, query);
            const matchingItems = items.filter(item => headingMatches || SettingsTemplates.matches(item.text, query));

            if (matchingItems.length === 0) return nullElement();

            return create("div")
                .classes("card", "flex-v")
                .children(
                    SettingsTemplates.sectionHeading(heading),
                    ...matchingItems.map(item => SettingsTemplates.notificationToggle(
                        item.text,
                        item.key,
                        getUserSettingValue(user, item.value),
                    )),
                ).build();
        }, searchQuery$);
    }

    static notificationToggle(text: StringOrSignal, key: string, currentValue: boolean) {
        return GenericTemplates.toggle(text, "notification_" + key, async () =>
            await UserActions.toggleNotificationSetting(key), [], currentValue);
    }

    static behaviourSection(user: User, searchQuery$: Signal<string>) {
        const heading = t("BEHAVIOUR");
        const items = [
            {
                text: t("PLAY_FROM_AUTO_QUEUE"),
                template: () => SettingsTemplates.playFromAutoQueueToggle(getUserSettingValue(user, UserSettings.playFromAutoQueue))
            },
            {
                text: t("MAKE_LIBRARY_PUBLIC"),
                template: () => SettingsTemplates.publicLikesToggle(getUserSettingValue(user, UserSettings.publicLikes))
            },
        ];

        return compute(query => {
            const headingMatches = SettingsTemplates.matches(heading, query);
            const matchingItems = items.filter(item => headingMatches || SettingsTemplates.matches(item.text, query));

            if (matchingItems.length === 0) return nullElement();

            return create("div")
                .classes("card", "flex-v")
                .children(
                    SettingsTemplates.sectionHeading(heading),
                    ...matchingItems.map(item => item.template()),
                ).build();
        }, searchQuery$);
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

    static themeSection(currentTheme: Theme, searchQuery$: Signal<string>) {
        const heading = t("UI_THEME");
        const themes = Object.values(Theme);
        const currentTheme$ = signal(currentTheme);

        return compute(query => {
            const headingMatches = SettingsTemplates.matches(heading, query);
            const themeMatches = themes.some(theme => SettingsTemplates.matches(theme, query));

            if (!headingMatches && !themeMatches) return nullElement();

            return create("div")
                .classes("card", "flex-v")
                .children(
                    SettingsTemplates.sectionHeading(heading),
                    GenericTemplates.combinedSelector(
                        themes,
                        async (newIndex: number) => {
                            currentTheme$.value = themes[newIndex];
                            await UserActions.setTheme(currentTheme$.value);
                        },
                        themes.indexOf(currentTheme$.value),
                    ),
                ).build();
        }, searchQuery$);
    }

    static languageSection(searchQuery$: Signal<string>) {
        const heading = t("LANGUAGE");
        const options = LanguageOptions;

        return compute(query => {
            const headingMatches = SettingsTemplates.matches(heading, query);
            const languageMatches = options.some(opt => SettingsTemplates.matches(opt.name, query));

            if (!headingMatches && !languageMatches) {
                return nullElement();
            }

            return create("div")
                .classes("card", "flex-v")
                .children(
                    SettingsTemplates.sectionHeading(heading),
                    select({
                        options: signal(options),
                        value: language,
                        onchange: value => language.value = value as Language,
                    }),
                ).build();
        }, searchQuery$);
    }

    static qualitySection(currentValue: StreamingQuality, searchQuery$: Signal<string>) {
        const heading = t("STREAMING_QUALITY");
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

        const qualityTexts: Record<StreamingQuality, StringOrSignal> = {
            [StreamingQuality.low]: t("QUALITY_LOW"),
            [StreamingQuality.medium]: t("QUALITY_MEDIUM"),
            [StreamingQuality.high]: t("QUALITY_HIGH"),
        };

        return compute(query => {
            const headingMatches = SettingsTemplates.matches(heading, query);
            const matchingQualities = values.filter(q => headingMatches || SettingsTemplates.matches(qualityTexts[q], query));

            if (matchingQualities.length === 0) return nullElement();

            return create("div")
                .classes("card", "flex-v")
                .children(
                    SettingsTemplates.sectionHeading(heading),
                    when(noSubscription,
                        create("div")
                            .classes("text", TextSize.small, "color-dim")
                            .text(t("MEDIUM_HIGH_ONLY_SUBSCRIPTION"))
                            .build()),
                    when(noSubscription, GenericTemplates.inlineLink(() => navigate(RoutePath.subscribe), t("SUBSCRIBE_FOR_HIGHER_QUALITY"))),
                    create("div")
                        .classes("flex", "small-gap")
                        .children(
                            ...matchingQualities.map(value =>
                                SettingsTemplates.qualitySelector(value, currentValue$, actualValue),
                            ),
                        ).build(),
                ).build();
        }, searchQuery$);
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

    private static dangerSection(user: User, searchQuery$: Signal<string>) {
        const heading = t("OTHER");

        const deleteAccountText = t("DELETE_ACCOUNT");
        const cancelDeleteText = t("CANCEL_ACCOUNT_DELETION");
        const downloadDataText = t("DOWNLOAD_DATA");

        const interactionButtons = [
            {et: EntityType.track, it: InteractionType.like},
            {et: EntityType.track, it: InteractionType.repost},
            {et: EntityType.album, it: InteractionType.like},
            {et: EntityType.playlist, it: InteractionType.like},
        ].map(b => ({
            text: t(`DELETE_ALL_INTERACTIONS`, b.et, b.it),
            template: () => SettingsTemplates.removeInteractionsButton(b.et, b.it)
        }));

        return compute(query => {
            const headingMatches = SettingsTemplates.matches(heading, query);

            const matchingInteractions = interactionButtons.filter(b => headingMatches || SettingsTemplates.matches(b.text, query));
            const deleteMatches = headingMatches || SettingsTemplates.matches(deleteAccountText, query);
            const cancelMatches = (headingMatches || SettingsTemplates.matches(cancelDeleteText, query)) && !!user.deleted_at;
            const downloadMatches = headingMatches || SettingsTemplates.matches(downloadDataText, query);

            if (!deleteMatches && !cancelMatches && !downloadMatches && matchingInteractions.length === 0) return nullElement();

            return create("div")
                .classes("card", "flex-v")
                .children(
                    SettingsTemplates.sectionHeading(heading),
                    horizontal(
                        when(deleteMatches, button({
                            text: deleteAccountText,
                            icon: {icon: "delete"},
                            classes: ["negative"],
                            disabled: !!user.deleted_at,
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
                        })),
                        when(cancelMatches, horizontal(
                            create("span")
                                .classes("warning", TextSize.small)
                                .text(t("SCHEDULED_FOR_DELETION")),
                            button({
                                text: cancelDeleteText,
                                icon: {icon: "restore_from_trash"},
                                classes: ["positive"],
                                onclick: () => {
                                    Ui.getConfirmationModal(
                                        t("CANCEL_ACCOUNT_DELETION"),
                                        t("CANCEL_ACCOUNT_DELETION_SURE"),
                                        t("YES_KEEP_ACCOUNT"),
                                        t("NO_STILL_DELETE_ACCOUNT"),
                                        async () => {
                                            Api.undeleteUser().then(() => {
                                                window.location.reload();
                                                notify(t("ACCOUNT_DELETION_CANCELLED"), NotificationType.success);
                                            });
                                        },
                                        () => {
                                        },
                                        "delete",
                                    ).then();
                                },
                            })
                        ).classes("align-children").build()),
                        when(downloadMatches, button({
                            text: downloadDataText,
                            icon: {icon: "download"},
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
                        })),
                    ).build(),
                    create("div")
                        .classes("flex")
                        .children(
                            ...matchingInteractions.map(b => b.template())
                        ).build()
                ).build();
        }, searchQuery$);
    }

    private static removeInteractionsButton(entityType: EntityType, interactionType: InteractionType) {
        return button({
            text: t(`DELETE_ALL_INTERACTIONS`, entityType, interactionType),
            icon: {icon: "delete"},
            classes: ["negative"],
            onclick: () => {
                Ui.getConfirmationModal(
                    t(`DELETE_ALL_INTERACTIONS`, entityType, interactionType),
                    t(`DELETE_ALL_INTERACTIONS_SURE`, entityType, interactionType),
                    t("YES"),
                    t("NO"),
                    async () => {
                        Api.removeAllInteractions(entityType, interactionType).then(() => {
                            notify(t("INTERACTIONS_DELETED", entityType, interactionType), NotificationType.success);
                        });
                    },
                    () => {
                    },
                    "delete",
                ).then();
            },
        });
    }

    private static linksSection(searchQuery$: Signal<string>) {
        const heading = t("LINKS");
        const roadmapText = t("ROADMAP");
        const sourceCodeText = t("SOURCE_CODE");

        return compute(query => {
            const headingMatches = SettingsTemplates.matches(heading, query);
            const roadmapMatches = SettingsTemplates.matches(roadmapText, query);
            const sourceCodeMatches = SettingsTemplates.matches(sourceCodeText, query);

            if (!headingMatches && !roadmapMatches && !sourceCodeMatches) return nullElement();

            return create("div")
                .classes("card", "flex-v")
                .children(
                    SettingsTemplates.sectionHeading(heading),
                    when(headingMatches, create("div")
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
                        .build()),
                    when(headingMatches || roadmapMatches, GenericTemplates.inlineLink(() => navigate(RoutePath.roadmap), roadmapText)),
                    when(headingMatches || sourceCodeMatches, GenericTemplates.inlineLink(
                        () => window.open("https://github.com/targoninc/lyda-ui-web-js", "_blank"),
                        sourceCodeText,
                    )),
                ).build();
        }, searchQuery$);
    }

    private static discographySection(searchQuery$: Signal<string>) {
        const heading = t("DISCOGRAPHY");
        const platforms = signal<{ platform: string; label: string; apiConfigured: boolean; currentUrl: string }[]>([]);
        Api.getDiscographyPlatforms().then(d => {
            if (d?.platforms) platforms.value = d.platforms;
        });

        const allPlatforms = [
            { key: "spotify", label: "Spotify" },
            { key: "appleMusic", label: "Apple Music" },
            { key: "youtubeMusic", label: "YouTube Music" },
            { key: "tidal", label: "Tidal" },
        ];

        return compute((query, pfs) => {
            const headingMatches = SettingsTemplates.matches(heading, query);
            if (!headingMatches) return nullElement();

            return create("div")
                .classes("card", "flex-v")
                .children(
                    SettingsTemplates.sectionHeading(heading),
                    create("p").classes("color-dim", "small").text(t("DISCOGRAPHY_DESCRIPTION")).build(),
                    vertical(
                        ...allPlatforms.map(p => {
                            const platformInfo = pfs.find(pi => pi.platform === p.key);
                            const urlSig = signal(platformInfo?.currentUrl ?? "");
                            const progress = signal<ProgressPart | null>(null);

                            return create("div")
                                .classes("flex-v", "small-gap")
                                .children(
                                    create("div")
                                        .classes("flex", "align-children", "small-gap")
                                        .children(
                                            GenericTemplates.icon("music_note", true),
                                            create("span").text(p.label).build(),
                                        ).build(),
                                    create("div")
                                        .classes("flex", "align-children", "small-gap")
                                        .children(
                                            input<string>({
                                                type: InputType.text,
                                                name: `link-${p.key}`,
                                                placeholder: `https://${p.label.toLowerCase().replaceAll(" ", "")}.com/...`,
                                                value: urlSig,
                                            }),
                                            button({
                                                text: t("SAVE"),
                                                icon: { icon: "save" },
                                                classes: ["small", "rounded-max"],
                                                onclick: async () => {
                                                    await Api.saveUserLink(p.label, urlSig.value);
                                                    notify(t("SUCCESS"), NotificationType.success);
                                                },
                                            }),
                                            when(
                                                compute((apiConf, url) => apiConf && url.trim().length > 0,
                                                    signal(platformInfo?.apiConfigured ?? false), urlSig),
                                                button({
                                                    text: t("IMPORT"),
                                                    icon: { icon: "download" },
                                                    classes: ["small", "rounded-max", "positive"],
                                                    onclick: async () => {
                                                        progress.value = {
                                                            icon: "cloud_download",
                                                            text: t("DISCOGRAPHY_FETCHING"),
                                                            state: ProgressState.inProgress,
                                                            title: p.label,
                                                        };

                                                        const eventSource = new EventSource(
                                                            `${Config.apiBaseUrl}/user/actions/import-discography-stream?platform=${p.key}&profileUrl=${encodeURIComponent(urlSig.value)}`,
                                                            { withCredentials: true } as any
                                                        );

                                                        eventSource.onmessage = (event) => {
                                                            const data = JSON.parse(event.data);
                                                            if (data.type === "progress") {
                                                                if (data.total) {
                                                                    progress.value = {
                                                                        icon: "download",
                                                                        text: `${data.message}`,
                                                                        state: ProgressState.inProgress,
                                                                        title: p.label,
                                                                        progress: data.current / data.total,
                                                                    };
                                                                } else {
                                                                    progress.value = {
                                                                        icon: "cloud_download",
                                                                        text: data.message ?? t("DISCOGRAPHY_IMPORTING"),
                                                                        state: ProgressState.inProgress,
                                                                        title: p.label,
                                                                    };
                                                                }
                                                            } else if (data.type === "done") {
                                                                const hasErrors = (data.errors?.length ?? 0) > 0;
                                                                progress.value = {
                                                                    icon: hasErrors ? "warning" : "check_circle",
                                                                    text: `${t("IMPORTED")} ${data.releasesImported} ${t("RELEASES")}, ${data.tracksImported} ${t("TRACKS")}${hasErrors ? `. ${t("ERROR")}: ${data.errors.length}` : ""}`,
                                                                    state: hasErrors ? ProgressState.warning : ProgressState.done,
                                                                    title: p.label,
                                                                };
                                                                eventSource.close();
                                                            } else if (data.type === "error") {
                                                                progress.value = {
                                                                    icon: "error",
                                                                    text: data.message ?? t("ERROR"),
                                                                    state: ProgressState.error,
                                                                    title: p.label,
                                                                };
                                                                eventSource.close();
                                                            }
                                                        };

                                                        eventSource.onerror = () => {
                                                            progress.value = {
                                                                icon: "error",
                                                                text: t("ERROR"),
                                                                state: ProgressState.error,
                                                                title: p.label,
                                                            };
                                                            eventSource.close();
                                                        };
                                                    },
                                                }),
                                            ),
                                        ).build(),
                                    GenericTemplates.progressSectionPart(progress),
                                ).build();
                        }),
                    ).build(),
                ).build();
        }, searchQuery$, platforms);
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
            emails$.value = structuredClone(emails$.value).map((e, i) => {
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
                    icon: {icon: "add"},
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
                        emails$.value = structuredClone(emails$.value).map((e, i) => {
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
                                icon: {icon: "verified_user"},
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
                                icon: {icon: "delete"},
                                classes: ["negative"],
                                onclick: async () => {
                                    await Ui.getConfirmationModal(
                                        t("DELETE_EMAIL"),
                                        t("DELETE_EMAIL_YOU_SURE"),
                                        t("YES"),
                                        t("NO"),
                                        async () => {
                                            emails$.value = structuredClone(emails$.value).filter(
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

    private static totpSection(searchQuery$: Signal<string>) {
        const heading = t("TOTP_DEVICES");
        const totpMethods = compute(u => u?.totp ?? [], currentUser);
        const userId = compute(u => u?.id, currentUser);
        const hasMethods = compute(m => m.length > 0, totpMethods);
        const loading = signal(false);

        return compute(query => {
            const headingMatches = SettingsTemplates.matches(heading, query);
            const addTotpText = t("ADD_TOTP");
            const btnMatches = SettingsTemplates.matches(addTotpText, query);
            const matchingMethods = totpMethods.value.filter(m => headingMatches || SettingsTemplates.matches(m.name, query));

            if (!headingMatches && !btnMatches && matchingMethods.length === 0) return nullElement();

            return create("div")
                .classes("flex-v", "card")
                .children(
                    SettingsTemplates.sectionHeading(heading),
                    when(
                        hasMethods,
                        create("span").text(t("NO_TOTP_CONFIGURED")).build(),
                        true,
                    ),
                    when(hasMethods, TotpTemplates.totpDevices(signal(matchingMethods), loading, userId)),
                    when(headingMatches || btnMatches, button({
                        text: addTotpText,
                        icon: {icon: "add"},
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
                    })),
                ).build();
        }, searchQuery$);
    }

    static sectionHeading(text: Signal<string>) {
        const id = text.value.trim().replaceAll(/\s+/g, "-").toLowerCase();
        const copyUrl = async () => {
            const url = new URL(window.location.href);
            await copy(`${url.origin}${url.pathname}#${id}`);
        }

        return horizontal(
            create("h1")
                .classes("bold", "clickable")
                .onclick(copyUrl)
                .children(
                    GenericTemplates.icon(SettingsTemplates.sectionIcons[id] ?? "settings", true),
                    create("span")
                        .text(text),
                    GenericTemplates.icon("link", true, ["showOnParentHover", "clickable", TextSize.xxLarge], t("COPY_LINK"), copyUrl),
                ),
        ).classes("align-children");
    }

    private static paymentSection(searchQuery$: Signal<string>) {
        const heading = t("PAYMENT_INFO");
        const searchText = t("STRIPE_CONNECT") + " Stripe";

        return compute(query => {
            const headingMatches = SettingsTemplates.matches(heading, query);
            const textMatches = SettingsTemplates.matches(searchText, query);

            if (!headingMatches && !textMatches) {
                return nullElement();
            }

            return create("div")
                .classes("flex-v", "card")
                .children(
                    SettingsTemplates.sectionHeading(heading),
                    create("p").classes("color-dim", "small").text(t("STRIPE_PAYOUT_DESCRIPTION")).build(),
                    SettingsTemplates.stripeConnectSection(),
                );
        }, searchQuery$);
    }

    private static stripeConnectSection() {
        const loading = signal(true);
        const accountStatus = signal<{
            connected: boolean;
            stripeAccountId?: string;
            onboardingComplete?: boolean;
            chargesEnabled?: boolean;
            payoutsEnabled?: boolean;
            detailsSubmitted?: boolean;
            country?: string;
            pendingVerification?: string[];
        } | null>(null);
        const error = signal("");
        const onboardingInProgress = signal(false);

        const load = () => {
            loading.value = true;
            error.value = "";
            StripeService.getAccountStatus()
                .then(d => accountStatus.value = d)
                .catch(e => error.value = String(e.message ?? e))
                .finally(() => loading.value = false);
        };
        load();

        return create("div").classes("flex-v", "small-gap").children(
            when(loading, GenericTemplates.loadingSpinner()),
            when(error, create("div").classes("flex-v", "small-gap").children(
                create("span").classes("error").text(error).build(),
                button({
                    text: t("RETRY"),
                    icon: { icon: "refresh" },
                    onclick: () => load(),
                }),
            ).build()),
            when(compute((s, l, e) => !l && !e, accountStatus, loading, error), create("div").classes("flex-v", "small-gap").children(
                when(compute(s => s?.connected ?? false, accountStatus), create("div").classes("flex-v", "small-gap", "padded").children(
                    create("span").classes("positive-text").text(t("STRIPE_ACCOUNT_CONNECTED")).build(),
                    create("div").classes("flex", "flex-wrap", "small-gap").children(
                        GenericTemplates.pill({
                            icon: compute(s => s?.chargesEnabled ? "check_circle" : "pending", accountStatus),
                            text: compute(s => s?.chargesEnabled ? t("CHARGES_ENABLED") : t("CHARGES_DISABLED"), accountStatus),
                        }),
                        GenericTemplates.pill({
                            icon: compute(s => s?.payoutsEnabled ? "check_circle" : "pending", accountStatus),
                            text: compute(s => s?.payoutsEnabled ? t("PAYOUTS_ENABLED") : t("PAYOUTS_DISABLED"), accountStatus),
                        }),
                    ).build(),
                    when(compute(s => !s?.onboardingComplete && s?.connected, accountStatus),
                        create("span").classes("warning", "small").text(t("STRIPE_ONBOARDING_PENDING")).build()),
                    when(compute(s => !!(s?.pendingVerification?.length), accountStatus),
                        create("span").classes("warning", "small")
                            .text(compute(s => t("STRIPE_PENDING_VERIFICATION", s?.pendingVerification?.join(", ") ?? ""), accountStatus))
                            .build()),
                    button({
                        text: t("REFRESH_STATUS"),
                        icon: { icon: "refresh" },
                        classes: ["small"],
                        onclick: () => load(),
                    }),
                ).build()),
                when(compute(s => s && !s.connected, accountStatus), create("div").classes("flex-v", "small-gap").children(
                    when(compute(o => o, onboardingInProgress), GenericTemplates.loadingSpinner()),
                    button({
                        text: compute(o => o ? t("OPENING_ONBOARDING") : t("CONNECT_STRIPE_ACCOUNT"), onboardingInProgress),
                        icon: { icon: "link" },
                        classes: ["special"],
                        disabled: onboardingInProgress,
                        onclick: async () => {
                            onboardingInProgress.value = true;
                            try {
                                const result = await StripeService.startOnboarding();
                                if ("completed" in result && result.completed) {
                                    notify(t("STRIPE_ONBOARDING_COMPLETE"), NotificationType.success);
                                    load();
                                }
                            } catch {
                                notify(t("STRIPE_ONBOARDING_FAILED"), NotificationType.error);
                            } finally {
                                onboardingInProgress.value = false;
                            }
                        },
                    }),
                ).build()),
            ).build()),
        ).build();
    }

    private static taxinfoSection(searchQuery$: Signal<string>) {
        const heading = t("TAX_INFO");
        const taxinfo = signal<UserTaxinfo | null>(null);
        Api.getTaxinfo().then(ti => taxinfo.value = ti ?? null);

        const fullName$ = signal("");
        const taxNumber$ = signal("");
        const countryCode$ = signal("");
        const regionCode$ = signal("");
        const addressLine1$ = signal("");
        const addressLine2$ = signal("");

        taxinfo.subscribe(ti => {
            if (!ti) return;
            fullName$.value = ti.full_name ?? "";
            taxNumber$.value = ti.tax_number ?? "";
            countryCode$.value = ti.country_code_iso3166_a3 ?? "";
            regionCode$.value = ti.region_code ?? "";
            addressLine1$.value = ti.address_line_1 ?? "";
            addressLine2$.value = ti.address_line_2 ?? "";
        });

        const countryOptions$ = signal<SelectOption<string>[]>([]);
        Api.getCountryCodes().then(codes => {
            if (codes) {
                countryOptions$.value = codes.map(c => ({
                    id: c.Code,
                    name: `${c.Name} (${c.Code})`
                }));
            }
        });

        const save = async () => {
            const res = await Api.updateTaxinfo({
                full_name: fullName$.value,
                tax_number: taxNumber$.value,
                country_code_iso3166_a3: countryCode$.value,
                region_code: regionCode$.value,
                address_line_1: addressLine1$.value,
                address_line_2: addressLine2$.value,
            });
            if (res) {
                notify(`${t("TAX_INFO_SAVED")}`, NotificationType.success);
            } else {
                notify(`${t("TAX_INFO_SAVE_FAILED")}`, NotificationType.error);
            }
        };

        const items = [
            {
                label: t("FULL_NAME"), template: () => input<string>({
                    type: InputType.text,
                    name: "full_name",
                    label: t("FULL_NAME"),
                    value: fullName$,
                    required: true,
                    onchange: v => fullName$.value = v,
                })
            },
            {
                label: t("TAX_NUMBER"), template: () => input<string>({
                    type: InputType.text,
                    name: "tax_number",
                    label: t("TAX_NUMBER"),
                    value: taxNumber$,
                    required: true,
                    onchange: v => taxNumber$.value = v,
                })
            },
            {
                label: t("COUNTRY_CODE"), template: () => create("div")
                    .classes("flex-v", "small-gap")
                    .children(
                        create("label").text(t("COUNTRY_CODE")).build(),
                        select({
                            options: countryOptions$,
                            value: countryCode$,
                            onchange: v => countryCode$.value = v,
                        }),
                    ).build()
            },
            {
                label: t("REGION_CODE"), template: () => input<string>({
                    type: InputType.text,
                    name: "region_code",
                    label: t("REGION_CODE"),
                    value: regionCode$,
                    required: true,
                    onchange: v => regionCode$.value = v,
                })
            },
            {
                label: t("ADDRESS_LINE_1"), template: () => input<string>({
                    type: InputType.text,
                    name: "address_line_1",
                    label: t("ADDRESS_LINE_1"),
                    value: addressLine1$,
                    required: true,
                    onchange: v => addressLine1$.value = v,
                })
            },
            {
                label: t("ADDRESS_LINE_2"), template: () => input<string>({
                    type: InputType.text,
                    name: "address_line_2",
                    label: t("ADDRESS_LINE_2"),
                    value: addressLine2$,
                    onchange: v => addressLine2$.value = v,
                })
            },
        ];

        return compute(query => {
            const headingMatches = SettingsTemplates.matches(heading, query);
            const matchingItems = items.filter(item => headingMatches || SettingsTemplates.matches(item.label, query));

            if (matchingItems.length === 0) return nullElement();

            return create("div")
                .classes("flex-v", "card")
                .id("tax-info-section")
                .children(
                    SettingsTemplates.sectionHeading(heading),
                    ...matchingItems.map(item => item.template()),
                    button({
                        text: t("SAVE"),
                        icon: {icon: "save"},
                        classes: ["positive", "fit-content"],
                        onclick: save,
                    }),
                ).build();
        }, searchQuery$);
    }
}