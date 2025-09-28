import { compute, create, signal, Signal, signalMap, when } from "@targoninc/jess";
import { GenericTemplates } from "../generic/GenericTemplates.ts";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { DashboardTemplates } from "./DashboardTemplates.ts";
import { Time } from "../../Classes/Helpers/Time.ts";
import { button, checkbox } from "@targoninc/jess-components";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { Permission } from "@targoninc/lyda-shared/src/Models/db/lyda/Permission";
import { Api } from "../../Api/Api.ts";
import { t } from "../../../locales";
import { sortByProperty } from "../../Classes/Helpers/Sorting.ts";

export class ModerationUsersTemplates {
    static usersPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canSetPermissions],
            ModerationUsersTemplates.usersListWithFilter()
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
                        })
                    )
                    .build(),
                ModerationUsersTemplates.usersList(users),
            ).build();
    }

    static usersList(users: Signal<User[]>) {
        const sortBy$ = signal<keyof User | null>(null);
        const filtered = compute(sortByProperty, sortBy$, users);

        return GenericTemplates.tableBody(
            GenericTemplates.tableHeaders<User>([
                { title: t("USERNAME"), property: "username" },
                { title: t("DISPLAY_NAME"), property: "displayname" },
                { title: t("PERMISSIONS"), property: "permissions" },
                { title: t("LAST_LOGIN"), property: "last_login" },
            ], sortBy$),
            signalMap(
                filtered,
                create("tbody"),
                u => ModerationUsersTemplates.user(u)
            ),
        );
    }

    static user(u: User) {
        const permissionsOpen = signal(false);
        const permissions = signal(u.permissions ?? []);

        return create("tr")
            .children(
                create("td").text(u.username).build(),
                create("td").text(u.displayname).build(),
                create("td")
                    .classes("relative")
                    .children(
                        button({
                            text: compute(p => p.length.toString(), permissions),
                            onclick: () => (permissionsOpen.value = !permissionsOpen.value),
                            icon: { icon: "lock_open" },
                        }),
                        when(
                            permissionsOpen,
                            ModerationUsersTemplates.permissionsPopup(permissions, u)
                        )
                    )
                    .build(),
                create("td")
                    .text(u.lastlogin ? Time.agoUpdating(new Date(u.lastlogin)) : "")
                    .build()
            ).build();
    }

    private static permissionsPopup(permissions: Signal<Permission[]>, u: User) {
        return create("div")
            .classes("popout-below", "flex-v", "padded", "rounded")
            .children(
                ...Object.values(Permissions).map(p => {
                    const hasPermission = compute(
                        up => up.some(upp => upp.name === p),
                        permissions
                    );

                    return create("div")
                        .classes("flex", "space-between")
                        .children(
                            ModerationUsersTemplates.permissionCheckbox(
                                p,
                                hasPermission,
                                u,
                                permissions
                            )
                        )
                        .build();
                })
            ).build();
    }

    private static permissionCheckbox(
        p: string,
        hasPermission: Signal<any>,
        u: User,
        permissions: Signal<Permission[]>
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
}