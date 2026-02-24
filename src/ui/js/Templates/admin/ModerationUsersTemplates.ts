import { AnyElement, compute, create, signal, Signal, signalMap, when } from "@targoninc/jess";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { DashboardTemplates } from "./DashboardTemplates.ts";
import { button, checkbox, heading } from "@targoninc/jess-components";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { Permission } from "@targoninc/lyda-shared/src/Models/db/lyda/Permission";
import { Api } from "../../Api/Api.ts";
import { t } from "../../../locales";
import { sortByProperty } from "../../Classes/Helpers/Sorting.ts";
import { GenericTemplates, horizontal, tabSelected, vertical } from "../generic/GenericTemplates.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { Images } from "../../Enums/Images.ts";
import { Util } from "../../Classes/Util.ts";
import { TextSize } from "../../Enums/TextSize.ts";
import { ModerationFilter } from "../../Models/ModerationFilter.ts";
import { ModerationCommentsTemplates } from "./ModerationCommentsTemplates.ts";
import { Comment } from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import { Ui } from "../../Classes/Ui.ts";

export class ModerationUsersTemplates {
    static usersPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canSetPermissions],
            ModerationUsersTemplates.usersListWithFilter(),
        );
    }

    static usersListWithFilter() {
        const users = signal<User[]>([]);
        const query = signal<string | null>(null);
        const offset = signal<number>(0);

        const refresh = async () => {
            const res = await Api.getUsers(query.value ?? "%", offset.value, 100);
            if (res) {
                users.value = res;
            }
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
                    )
                    .build(),
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
        const permissions = signal(u.permissions ?? []);
        const avatar$ = signal(Images.DEFAULT_AVATAR);
        if (u.has_avatar) {
            avatar$.value = Util.getUserAvatar(u.id);
        }
        const tabs = ["Permissions", "Comments"];
        const i$ = signal(0);

        return create("details").children(
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
                                when(u.verified, UserTemplates.verificationBadge()),
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
                            ).classes("small-gap")
                        ).classes("nogap")
                    ).classes("align-children"),
                    vertical(
                        when(u.lastlogin, GenericTemplates.timestamp(u.lastlogin ?? new Date())),
                        when(u.secondlastlogin, GenericTemplates.timestamp(u.secondlastlogin ?? new Date())),
                    )
                ).classes("fullWidth", "space-between", "align-children")
            ),
            vertical(
                horizontal(
                    button({
                        text: t("BAN_USER"),
                        classes: ["negative"],
                        onclick: async () => {
                            await Ui.getConfirmationModal(t("BAN_USER"), t("BAN_USER_CONFIRM"), t("BAN_USER"), t("NO"), async () => {
                                await Api.banUser(u.id);
                                permissions.value = [];
                            }, async () => {});
                        }
                    })
                ),
                GenericTemplates.combinedSelector(tabs, newIndex => i$.value = newIndex, 0),
                when(
                    tabSelected(i$, 0), ModerationUsersTemplates.permissionsPopup(permissions, u)
                ),
                when(
                    tabSelected(i$, 1), ModerationUsersTemplates.userComments(u)
                ),
            ).classes("card")
        ).build();
    }

    private static permissionsPopup(permissions: Signal<Permission[]>, u: User) {
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
                        )
                        .build();
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

    private static userComments(u: User) {
        const commentsList = signal<AnyElement>(create("div").build());
        const filterState = signal<ModerationFilter>({
            potentiallyHarmful: false,
            user_id: u.id,
            offset: 0,
            limit: 10
        });
        const loading = signal(false);
        const comments = signal<Comment[]>([]);

        const update = async (newFilter: ModerationFilter) => {
            commentsList.value = create("div").build();
            comments.value = (await Api.getModerationComments(newFilter, loading)) ?? [];
            if (comments.value) {
                commentsList.value = ModerationCommentsTemplates.moderatableCommentsList(comments.value, false);
            }
        }
        filterState.subscribe(update);
        update(filterState.value).then();

        return vertical(
            create("div")
                .classes("flex", "align-children", "card")
                .children(
                    ModerationCommentsTemplates.commentFilters(filterState, loading, comments, false),
                    button({
                        text: t("REFRESH"),
                        icon: { icon: "refresh" },
                        classes: ["positive"],
                        onclick: async () => await update(filterState.value)
                    }),
                    when(loading, GenericTemplates.loadingSpinner()),
                ).build(),
            commentsList
        ).build();
    }
}