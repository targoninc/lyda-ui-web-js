import {compute, Signal, signal, create, when} from "@targoninc/jess";
import {GenericTemplates} from "../generic/GenericTemplates.ts";
import {Permissions} from "@targoninc/lyda-shared/src/Enums/Permissions";
import {DashboardTemplates} from "./DashboardTemplates.ts";
import {Time} from "../../Classes/Helpers/Time.ts";
import { button, checkbox } from "@targoninc/jess-components";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {Permission} from "@targoninc/lyda-shared/src/Models/db/lyda/Permission";
import { Api } from "../../Api/Api.ts";

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
                            text: "Refresh",
                            icon: { icon: "refresh" },
                            classes: ["positive"],
                            onclick: async () => {
                                users.value = [];
                                await refresh();
                            },
                        })
                    )
                    .build(),
                compute(u => ModerationUsersTemplates.usersList(u), users)
            )
            .build();
    }

    static usersList(users: User[]) {
        return GenericTemplates.tableBody(
            GenericTemplates.tableHeaders([
                { title: "Username" },
                { title: "Display name" },
                { title: "Permissions" },
                { title: "Last login" },
            ]),
            create("tbody")
                .children(...users.map(u => ModerationUsersTemplates.user(u)))
                .build()
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
            )
            .build();
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
                        .classes("flex", "space-outwards")
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
            )
            .build();
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