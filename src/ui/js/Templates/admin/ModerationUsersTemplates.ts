import { AnyElement, compute, create, InputType, signal, Signal, signalMap, when } from "@targoninc/jess";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { DashboardTemplates } from "./DashboardTemplates.ts";
import { button, checkbox, heading, input, toggle } from "@targoninc/jess-components";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { Permission } from "@targoninc/lyda-shared/src/Models/db/lyda/Permission";
import { Api } from "../../Api/Api.ts";
import { t } from "../../../locales";
import { sortByProperty } from "../../Classes/Helpers/Sorting.ts";
import { GenericTemplates, horizontal, tabSelected, vertical } from "../generic/GenericTemplates.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { Images } from "../../Enums/Images.ts";
import { target, Util } from "../../Classes/Util.ts";
import { TextSize } from "../../Enums/TextSize.ts";
import { ModerationFilter } from "../../Models/ModerationFilter.ts";
import { ModerationCommentsTemplates } from "./ModerationCommentsTemplates.ts";
import { Comment } from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import { Ui } from "../../Classes/Ui.ts";
import { UserIp } from "@targoninc/lyda-shared/src/Models/db/lyda/UserIp.ts";

export class ModerationUsersTemplates {
    static usersPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canSetPermissions],
            ModerationUsersTemplates.usersListWithFilter(),
        );
    }

    static usersListWithFilter() {
        const users = signal<User[]>([]);
        const query = signal<string>("");
        const skip = signal<number>(0);
        const loading = signal(false);

        const refresh = async () => {
            loading.value = true;
            Api.getUsers(query.value ?? "", skip.value, 10).then(u => {
                if (u) {
                    users.value = u;
                }
            }).finally(() => loading.value = false);
        };
        refresh().then();

        return create("div")
            .children(
                create("div")
                    .classes("flex", "align-children", "fixed-bar")
                    .children(
                        button({
                            text: t("REFRESH"),
                            icon: { icon: "refresh" },
                            classes: ["positive"],
                            onclick: async () => {
                                users.value = [];
                                await refresh();
                            },
                        }),
                        input<string>({
                            type: InputType.text,
                            name: "search",
                            placeholder: t("FILTER"),
                            value: query,
                            debounce: 200,
                            onchange: async (v: string) => {
                                query.value = v;
                                skip.value = 0;
                                await refresh();
                            },
                        }),
                        button({
                            text: t("PREVIOUS_PAGE"),
                            icon: { icon: "skip_previous" },
                            disabled: compute((l, s) => l || s <= 0, loading, skip),
                            onclick: async () => {
                                skip.value = Math.max(0, skip.value - 10);
                                await refresh();
                            },
                        }),
                        button({
                            text: t("NEXT_PAGE"),
                            icon: { icon: "skip_next" },
                            disabled: compute((l, e) => l || e.length < 10, loading, users),
                            onclick: async () => {
                                skip.value = skip.value + 10;
                                await refresh();
                            },
                        }),
                        when(loading, GenericTemplates.loadingSpinner())
                    ).build(),
                ModerationUsersTemplates.usersList(users),
            ).build();
    }

    static usersList(users: Signal<User[]>) {
        const sortBy$ = signal<keyof User | null>(null);
        const filtered = compute(sortByProperty, sortBy$, users);

        return signalMap(
            filtered,
            vertical().classes("fixed-bar-content"),
            u => ModerationUsersTemplates.user(u),
        );
    }

    static user(u: User) {
        const verified = signal(u.verified);
        const avatar$ = signal(Images.DEFAULT_AVATAR);
        if (u.has_avatar) {
            avatar$.value = Util.getUserAvatar(u.id);
        }
        const tabs = ["Permissions", "Comments", "IPs"];
        const i$ = signal(0);
        const open = signal(false);

        return create("details")
            .on("toggle", e => {
                open.value = target<HTMLDetailsElement>(e).open;
            })
            .children(
                create("summary").children(
                    horizontal(
                        horizontal(
                            UserTemplates.userIcon(u.id, avatar$, true),
                            vertical(
                                horizontal(
                                    heading({
                                        text: u.displayname,
                                        level: 3,
                                    }),
                                    create("span")
                                        .classes(TextSize.xSmall, "nopointer")
                                        .text("@" + u.username)
                                        .build(),
                                    when(verified, UserTemplates.verificationBadge()),
                                ).classes("align-children"),
                                horizontal(
                                    when(u.deleted_at, create("span")
                                        .classes("deleted-pill")
                                        .text(t("ACCOUNT_DELETED"))
                                        .build()),
                                    when(u.banned_at, create("span")
                                        .classes("banned-pill")
                                        .text(t("BANNED"))
                                        .build()),
                                ).classes("small-gap"),
                            ).classes("nogap"),
                        ).classes("align-children"),
                        horizontal(
                            when(u.lastlogin, GenericTemplates.timestamp(u.lastlogin ?? new Date())),
                            when(u.secondlastlogin, GenericTemplates.timestamp(u.secondlastlogin ?? new Date())),
                        ),
                    ).classes("fullWidth", "space-between", "align-children"),
                ),
                vertical(
                    horizontal(
                        button({
                            text: t("BAN_USER"),
                            icon: {
                                icon: "gavel"
                            },
                            classes: ["negative"],
                            disabled: !!u.banned_at,
                            onclick: async () => {
                                await Ui.getConfirmationModal(t("BAN_USER"), t("BAN_USER_CONFIRM"), t("BAN_USER"), t("NO"), async () => {
                                    await Api.banUser(u.id);
                                }, async () => {});
                            },
                        }),
                        UserTemplates.verifyUserButton(u, verified),
                    ),
                    GenericTemplates.combinedSelector(tabs, newIndex => i$.value = newIndex, 0),
                    when(
                        tabSelected(i$, 0), ModerationUsersTemplates.permissionsPopup(u, open),
                    ),
                    when(
                        tabSelected(i$, 1), ModerationUsersTemplates.userComments(u, open),
                    ),
                    when(
                        tabSelected(i$, 2), ModerationUsersTemplates.userIps(u, open),
                    ),
                ).classes("card"),
            ).build();
    }

    private static permissionsPopup(u: User, open: Signal<boolean>) {
        const permissions = signal<Permission[]>(u.permissions ?? []);
        const update = () => {
            if (open.value) {
                Api.getPermissions(u.id).then(perms => {
                    if (perms) {
                        permissions.value = perms;
                    }
                });
            }
        };
        open.subscribe(update);

        return create("div")
            .classes("flex-v", "padded", "rounded")
            .children(
                ...Object.values(Permissions).map(p => {
                    const hasPermission = compute(
                        up => up.some(upp => upp.name === p),
                        permissions,
                    );

                    return create("div")
                        .classes("flex", "space-between")
                        .children(
                            ModerationUsersTemplates.permissionCheckbox(
                                p,
                                hasPermission,
                                u,
                                permissions,
                            ),
                        ).build();
                }),
            ).build();
    }

    private static permissionCheckbox(
        p: string,
        hasPermission: Signal<any>,
        u: User,
        permissions: Signal<Permission[]>,
    ) {
        return checkbox({
            text: p,
            checked: hasPermission,
            onchange: async () => {
                const val = !hasPermission.value;
                await Api.setUserPermission(u.id, p, val);
                if (val) {
                    permissions.value = [
                        ...permissions.value,
                        {
                            name: p,
                            id: -1,
                            created_at: new Date(),
                            updated_at: new Date(),
                            description: "",
                        },
                    ];
                } else {
                    permissions.value = permissions.value.filter(pm => pm.name !== p);
                }
            },
        });
    }

    private static userComments(u: User, open: Signal<boolean>) {
        const commentsList = signal<AnyElement>(create("div").build());
        const filterState = signal<ModerationFilter>({
            potentiallyHarmful: false,
            user_id: u.id,
            offset: 0,
            limit: 10,
        });
        const loading = signal(false);
        const comments = signal<Comment[]>([]);

        const update = async (newFilter: ModerationFilter) => {
            if (!open.value) {
                commentsList.value = create("div").build();
                return;
            }
            commentsList.value = create("div").build();
            comments.value = (await Api.getModerationComments(newFilter, loading)) ?? [];
            if (comments.value) {
                commentsList.value = ModerationCommentsTemplates.moderatableCommentsList(comments.value, false);
            }
        };
        filterState.subscribe(update);
        open.subscribe(() => update(filterState.value).then());

        return vertical(
            create("div")
                .classes("flex", "align-children", "card")
                .children(
                    ModerationCommentsTemplates.commentFilters(filterState, loading, comments, false),
                    button({
                        text: t("REFRESH"),
                        icon: { icon: "refresh" },
                        classes: ["positive"],
                        onclick: async () => await update(filterState.value),
                    }),
                    when(loading, GenericTemplates.loadingSpinner()),
                ).build(),
            commentsList,
        ).build();
    }

    private static userIps(u: User, open: Signal<boolean>) {
        const ips = signal<UserIp[]>([]);
        const filters = signal<string[]>(["cf-connecting-ip"]);
        const filtered = compute((i, f) => i.filter(ip => f.includes(ip.header)), ips, filters);
        const update = async () => {
            if (!open.value) {
                ips.value = [];
                return;
            }
            Api.getUserIps(u.id).then(i => ips.value = i ?? []);
        };
        open.subscribe(update);
        const toggleHeader = (header: string, on: boolean) => {
            if (!on) {
                filters.value = filters.value.filter(h => h !== header);
            } else {
                filters.value = [...filters.value, header];
            }
        }

        return vertical(
            horizontal(
                toggle({
                    text: "cf-connecting-ip",
                    checked: compute(f => f.includes("cf-connecting-ip"), filters),
                    onchange: n => toggleHeader("cf-connecting-ip", n),
                }),
                toggle({
                    text: "x-forwarded-for",
                    checked: compute(f => f.includes("x-forwarded-for"), filters),
                    onchange: n => toggleHeader("x-forwarded-for", n),
                }),
                toggle({
                    text: "ip",
                    checked: compute(f => f.includes("ip"), filters),
                    onchange: n => toggleHeader("ip", n),
                }),
            ),
            signalMap(filtered, vertical(),
                    ip => ModerationUsersTemplates.userIp(ip)),
        ).build();
    }

    private static userIp(ip: UserIp) {
        return horizontal(
            horizontal(
                create("span")
                    .classes("color-dim")
                    .text(ip.header)
                    .build(),
                create("span")
                    .classes("bold")
                    .text(ip.ip)
                    .build(),
            ),
            horizontal(
                create("span")
                    .classes("mono", "text-small")
                    .text(ip.last_user_agent)
                    .build(),
                GenericTemplates.timestamp(ip.created_at!),
            ).classes("align-children")
        ).classes("card", "secondary", "space-between").build();
    }
}