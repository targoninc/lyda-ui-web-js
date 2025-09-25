import { AnyElement, compute, create, when } from "@targoninc/jess";
import { navigate } from "../../Routing/Router.ts";
import { RoutePath } from "../../Routing/routes.ts";
import { GenericTemplates } from "../generic/GenericTemplates.ts";
import { permissions } from "../../state.ts";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { button } from "@targoninc/jess-components";
import { t } from "../../../locales";

export class DashboardTemplates {
    static dashboardPage() {
        const hasAnyPermission = compute(p => p.length > 0, permissions);
        const hasPermission = (name: Permissions) => {
            return compute(ps => ps.some(p => p.name === name), permissions);
        }

        return create("div")
            .classes("flex-v")
            .children(
                GenericTemplates.title(t("DASHBOARD")),
                when(hasAnyPermission, GenericTemplates.missingPermission(), true),
                when(hasAnyPermission, create("div")
                    .classes("flex")
                    .children(
                        when(hasPermission(Permissions.canDeleteComments), button({
                            text: t("MODERATION"),
                            onclick: () => navigate(RoutePath.moderation),
                            icon: { icon: "comments_disabled" },
                        })),
                        when(hasPermission(Permissions.canViewLogs), button({
                            text: t("LOGS"),
                            onclick: () => navigate(RoutePath.logs),
                            icon: { icon: "receipt_long" },
                        })),
                        when(hasPermission(Permissions.canViewLogs), button({
                            text: t("EVENTS"),
                            onclick: () => navigate(RoutePath.events),
                            icon: { icon: "manage_history" },
                        })),
                        when(hasPermission(Permissions.canViewActionLogs), button({
                            text: t("ACTION_LOGS"),
                            onclick: () => navigate(RoutePath.actionLogs),
                            icon: { icon: "content_paste_search" },
                        })),
                        when(hasPermission(Permissions.canViewPayments), button({
                            text: t("PAYMENTS"),
                            onclick: () => navigate(RoutePath.payouts),
                            icon: { icon: "payments" },
                        })),
                        when(hasPermission(Permissions.canCalculateRoyalties), button({
                            text: t("ROYALTIES"),
                            onclick: () => navigate(RoutePath.royaltyManagement),
                            icon: { icon: "currency_exchange" },
                        })),
                        when(hasPermission(Permissions.canSetPermissions), button({
                            text: t("USERS"),
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
                button({
                    text: t("DASHBOARD"),
                    onclick: () => navigate(RoutePath.admin),
                    icon: { icon: "terminal" },
                }),
                when(hasPermission, GenericTemplates.missingPermission(), true),
                when(hasPermission, page),
            ).build();
    }
}