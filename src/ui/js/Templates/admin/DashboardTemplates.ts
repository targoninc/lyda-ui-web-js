import {create, ifjs, nullElement} from "../../../fjsc/src/f2.ts";
import {navigate} from "../../Routing/Router.ts";
import {RoutePath} from "../../Routing/routes.ts";
import {FJSC} from "../../../fjsc";
import {GenericTemplates} from "../GenericTemplates.ts";
import {permissions} from "../../state.ts";
import {compute, signal} from "../../../fjsc/src/signals.ts";
import {Permissions} from "../../Enums/Permissions.ts";
import {RoyaltyTemplates} from "./RoyaltyTemplates.ts";
import {Api} from "../../Api/Api.ts";
import {RoyaltyInfo} from "../../Models/RoyaltyInfo.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";

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
                ifjs(hasAnyPermission, create("div")
                    .classes("flex-v")
                    .children(
                        create("span")
                            .classes("warning")
                            .text("Nothing for you here, unfortunately.")
                            .build(),
                        FJSC.button({
                            text: "Go explore somewhere else",
                            onclick: () => navigate(RoutePath.explore),
                            icon: { icon: "explore" }
                        }),
                    ).build(), true),
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
                        ifjs(hasPermission(Permissions.canCalculateRoyalties), FJSC.button({
                            text: "Royalties",
                            onclick: () => navigate(RoutePath.royaltyManagement),
                            icon: { icon: "currency_exchange" },
                        })),
                    ).build())
            ).build();
    }

    static royaltyManagementPage() {
        const royaltyInfo = signal<any>(null);
        Api.getAsync<RoyaltyInfo>(ApiRoutes.getRoyaltyInfo).then(res => {
            if (res.data) {
                royaltyInfo.value = res.data;
            }
        });

        return create("div")
            .classes("flex-v")
            .children(
                compute(r => r ? RoyaltyTemplates.royaltyOverview(r) : nullElement(), royaltyInfo)
            ).build();
    }
}