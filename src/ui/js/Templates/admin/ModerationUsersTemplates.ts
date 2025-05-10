import {User} from "../../Models/DbModels/lyda/User";
import {compute, Signal, signal} from "../../../fjsc/src/signals.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";
import {Api} from "../../Api/Api.ts";
import {create, ifjs} from "../../../fjsc/src/f2.ts";
import {FJSC} from "../../../fjsc";
import {GenericTemplates} from "../generic/GenericTemplates.ts";
import {Permissions} from "../../Enums/Permissions.ts";
import {DashboardTemplates} from "./DashboardTemplates.ts";
import {Permission} from "../../Models/DbModels/lyda/Permission.ts";
import {Time} from "../../Classes/Helpers/Time.ts";

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
            const res = await Api.getAsync<User[]>(ApiRoutes.getUsers, {
                query: query.value ?? "%",
                offset: offset.value,
                limit: 100
            });
            if (res.data) {
                users.value = res.data;
            }
        }
        refresh();

        return create("div")
            .children(
                create("div")
                    .classes("flex", "align-children", "fixed-bar")
                    .children(
                        FJSC.button({
                            text: "Refresh",
                            icon: {icon: "refresh"},
                            classes: ["positive"],
                            onclick: async () => {
                                users.value = [];
                                await refresh();
                            }
                        }),
                    ).build(),
                compute(u => ModerationUsersTemplates.usersList(u), users)
            ).build();
    }

    static usersList(users: User[]) {
        return GenericTemplates.tableBody(
            GenericTemplates.tableHeaders([
                {title: "Username"},
                {title: "Display name"},
                {title: "Permissions"},
                {title: "Last login"},
            ]),
            create("tbody")
                .children(
                    ...users.map(u => ModerationUsersTemplates.user(u))
                ).build(),
        );
    }

    static user(u: User) {
        const permissionsOpen = signal(false);
        const permissions = signal(u.permissions ?? []);

        return create("tr")
            .children(
                create("td")
                    .text(u.username)
                    .build(),
                create("td")
                    .text(u.displayname)
                    .build(),
                create("td")
                    .classes("relative")
                    .children(
                        FJSC.button({
                            text: compute(p => p.length.toString(), permissions),
                            onclick: () => permissionsOpen.value = !permissionsOpen.value,
                            icon: {icon: "lock_open"},
                        }),
                        ifjs(permissionsOpen,
                            ModerationUsersTemplates.permissionsPopup(permissions, u))
                    ).build(),
                create("td")
                    .text(u.lastlogin ? Time.agoUpdating(new Date(u.lastlogin)) : "")
                    .build(),
            ).build()
    }

    private static permissionsPopup(permissions: Signal<Permission[]>, u: User) {
        return create("div")
            .classes("popout-below", "flex-v", "padded", "rounded")
            .children(
                ...Object.values(Permissions).map(p => {
                    const hasPermission = compute(up => up.some(upp => upp.name === p), permissions);

                    return create("div")
                        .classes("flex", "space-outwards")
                        .children(
                            ModerationUsersTemplates.permissionCheckbox(p, hasPermission, u, permissions)
                        ).build();
                }),
            ).build();
    }

    private static permissionCheckbox(p: string, hasPermission: Signal<any>, u: User, permissions: Signal<Permission[]>) {
        return FJSC.checkbox({
            text: p,
            checked: hasPermission,
            onchange: () => {
                const val = !hasPermission.value;
                Api.postAsync(ApiRoutes.setUserPermission, {
                    permissionName: p,
                    user_id: u.id,
                    userHasPermission: val
                }).then(res => {
                    if (res.code === 200) {
                        if (val) {
                            permissions.value = [
                                ...permissions.value,
                                {
                                    name: p,
                                    id: -1,
                                    created_at: new Date(),
                                    updated_at: new Date(),
                                    description: "",
                                }
                            ];
                        } else {
                            permissions.value = permissions.value.filter(pm => pm.name !== p);
                        }
                    }
                })
            }
        });
    }
}