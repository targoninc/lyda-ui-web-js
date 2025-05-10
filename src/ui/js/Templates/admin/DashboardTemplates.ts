import {AnyElement, create, ifjs} from "../../../fjsc/src/f2.ts";
import {navigate} from "../../Routing/Router.ts";
import {RoutePath} from "../../Routing/routes.ts";
import {FJSC} from "../../../fjsc";
import {GenericTemplates} from "../generic/GenericTemplates.ts";
import {permissions} from "../../state.ts";
import {compute} from "../../../fjsc/src/signals.ts";
import {Permissions} from "../../Enums/Permissions.ts";

export class DashboardTemplates {
    static dashboardPage() {
        const hasAnyPermission = compute(p => p.length > 0, permissions);
        const hasPermission = (name: Permissions) => {
            return compute(ps => ps.some(p => p.name === name), permissions);
        }

        return create("div")
            .classes("flex-v")
            .children(
                GenericTemplates.title("Dashboard"),
                ifjs(hasAnyPermission, GenericTemplates.missingPermission(), true),
                ifjs(hasAnyPermission, create("div")
                    .classes("flex")
                    .children(
                        ifjs(hasPermission(Permissions.canDeleteComments), FJSC.button({
                            text: "Moderation",
                            onclick: () => navigate(RoutePath.moderation),
                            icon: { icon: "comments_disabled" },
                        })),
                        ifjs(hasPermission(Permissions.canViewLogs), FJSC.button({
                            text: "Logs",
                            onclick: () => navigate(RoutePath.logs),
                            icon: { icon: "receipt_long" },
                        })),
                        ifjs(hasPermission(Permissions.canViewLogs), FJSC.button({
                            text: "Events",
                            onclick: () => navigate(RoutePath.events),
                            icon: { icon: "manage_history" },
                        })),
                        ifjs(hasPermission(Permissions.canViewPayments), FJSC.button({
                            text: "Payments",
                            onclick: () => navigate(RoutePath.payments),
                            icon: { icon: "payments" },
                        })),
                        ifjs(hasPermission(Permissions.canCalculateRoyalties), FJSC.button({
                            text: "Royalties",
                            onclick: () => navigate(RoutePath.royaltyManagement),
                            icon: { icon: "currency_exchange" },
                        })),
                        ifjs(hasPermission(Permissions.canSetPermissions), FJSC.button({
                            text: "Users",
                            onclick: () => navigate(RoutePath.users),
                            icon: { icon: "groups" },
                        })),
                    ).build())
            ).build();
    }

    static pageNeedingPermissions(needed: Permissions[], page: AnyElement) {
        const hasPermission = compute(ps => needed.every(n => ps.some(p => p.name === n)), permissions);

        return create("div")
            .classes("flex-v")
            .children(
                FJSC.button({
                    text: "Dashboard",
                    onclick: () => navigate(RoutePath.admin),
                    icon: { icon: "terminal" },
                }),
                ifjs(hasPermission, GenericTemplates.missingPermission(), true),
                ifjs(hasPermission, page),
            ).build();
    }
}