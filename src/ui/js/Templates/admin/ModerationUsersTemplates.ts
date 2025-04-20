import {User} from "../../Models/DbModels/lyda/User";
import {compute, signal} from "../../../fjsc/src/signals.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";
import {Api} from "../../Api/Api.ts";
import {create, ifjs} from "../../../fjsc/src/f2.ts";
import {FJSC} from "../../../fjsc";
import {GenericTemplates} from "../GenericTemplates.ts";
import {Permissions} from "../../Enums/Permissions.ts";
import {permissions} from "../../state.ts";

export class ModerationUsersTemplates {
    static usersPage() {
        const hasPermission = (name: Permissions) => {
            return compute(ps => ps.some(p => p.name === name), permissions);
        }
        const hasSetPermissionPermission = hasPermission(Permissions.canSetPermissions);

        return create("div")
            .classes("flex-v")
            .children(
                ifjs(hasSetPermissionPermission, GenericTemplates.missingPermission(), true),
                ifjs(hasSetPermissionPermission, ModerationUsersTemplates.usersListWithFilter()),
            ).build();
    }

    static usersListWithFilter() {
        const users = signal<User[]>([]);
        const query = signal<string|null>(null);
        const offset = signal<number>(0);

        const refresh = async () => {
            const res = await Api.getAsync<User[]>(ApiRoutes.getUsers, {
                query: query.value ?? "%",
                offset: offset.value,
                limit: 100
            });
            console.log(res);
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
                            icon: { icon: "refresh" },
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
                { title: "Username" },
                { title: "Display name" },
            ]),
            create("tbody")
                .children(
                    ...users.map(u => ModerationUsersTemplates.user(u))
                ).build(),
        );
    }

    static user(u: User) {
        return create("tr")
            .children(
                create("td")
                    .text(u.username)
                    .build(),
                create("td")
                    .text(u.displayname)
                    .build(),
            ).build()
    }
}