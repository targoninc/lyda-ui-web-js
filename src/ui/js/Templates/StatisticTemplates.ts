import {compute, signal, create, when, nullElement} from "@targoninc/jess";
import {currency} from "../Classes/Helpers/Num.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {downloadFile} from "../Classes/Util.ts";
import {ChartTemplates} from "./generic/ChartTemplates.ts";
import {anonymize} from "../Classes/Helpers/CustomText.ts";
import {navigate, reload} from "../Routing/Router.ts";
import {StatisticsWrapper} from "../Classes/StatisticsWrapper.ts";
import {permissions} from "../state.ts";
import {RoutePath} from "../Routing/routes.ts";
import {yearAndMonthByOffset} from "../Classes/Helpers/Date.ts";
import {GenericTemplates} from "./generic/GenericTemplates.ts";
import { button } from "@targoninc/jess-components";
import {UserSettings} from "@targoninc/lyda-shared/src/Enums/UserSettings";
import {NotificationType} from "../Enums/NotificationType.ts";
import {RoyaltyInfo} from "@targoninc/lyda-shared/src/Models/RoyaltyInfo";
import {Api} from "../Api/Api.ts";

export class StatisticTemplates {
    static playCountByMonthChart() {
        return ChartTemplates.paginatedBarChart({
            title: "Play count by month",
            endpoint: ApiRoutes.getPlayCountByMonth,
            timeType: "month"
        });
    }

    static royaltiesByMonthChart() {
        return ChartTemplates.paginatedBarChart({
            title: "Royalties by month",
            endpoint: ApiRoutes.getRoyaltiesByMonth,
            timeType: "month"
        });
    }

    static likesByTrackChart(trackNames: string[], likeCounts: number[]) {
        if (trackNames.length === 0) {
            return ChartTemplates.noData("Likes by track");
        }
        return ChartTemplates.barChart(trackNames, likeCounts, "Likes", "Likes by track", "likesByTrackChart");
    }

    static activityByTimeChart(labels: string[], values: number[], title: string) {
        const id = Math.floor(Math.random() * 1000);
        return ChartTemplates.barChart(labels, values, title, `${title} by time`, `activityByTimeChart-${id}`);
    }

    static royaltiesByTrackChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return ChartTemplates.noData("Royalties by track");
        }
        return ChartTemplates.barChart(labels, values, "Royalties", "Royalties by track", "royaltiesByTrackChart");
    }

    static playCountByTrackChart(trackNames: string[], playCounts: number[]) {
        if (trackNames.length === 0) {
            return ChartTemplates.noData("Play count by track");
        }
        return ChartTemplates.barChart(trackNames, playCounts, "Plays", "Play count by track", "playCountByTrackChart");
    }

    static async allStats() {
        const stats = await StatisticsWrapper.getStatistics(permissions.value);

        return create("div")
            .classes("flex", "fullWidth")
            .children(
                ...stats
            ).build();
    }

    static artistRoyaltyActions() {
        const royaltyInfo = signal<RoyaltyInfo|null>(null);
        Api.getRoyaltyInfo().then(ri => royaltyInfo.value = ri);
        const hasPayableRoyalties = compute(ri => ri && ri.available && parseFloat(ri.available) >= 0.5, royaltyInfo);
        const paypalMailExists$ = compute(ri => ri && ri.paypalMail !== null, royaltyInfo);

        return create("div")
            .classes("flex-v", "card")
            .children(
                compute(ri => ri ? StatisticTemplates.royaltyInfo(ri) : nullElement(), royaltyInfo),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: "Payout history",
                            icon: {icon: "account_balance"},
                            onclick: () => navigate(RoutePath.payouts)
                        }),
                        when(hasPayableRoyalties, create("div")
                            .classes("flex")
                            .children(
                                when(paypalMailExists$, button({
                                    text: "Set PayPal mail",
                                    icon: {icon: "mail"},
                                    classes: ["positive"],
                                    onclick: async () => {
                                        await Ui.getTextInputModal("Set PayPal mail", "The account you will receive payments with", "", "Save", "Cancel", async (address: string) => {
                                            await Api.updateUserSetting(UserSettings.paypalMail, address);
                                            notify("PayPal mail set", NotificationType.success);
                                            paypalMailExists$.value = true;
                                        }, () => {
                                        }, "mail");
                                    }
                                }), true),
                                when(paypalMailExists$, button({
                                    text: "Remove PayPal mail",
                                    title: "You won't be able to receive payments until you set a mail address again",
                                    icon: {icon: "unsubscribe"},
                                    classes: ["negative"],
                                    onclick: async () => {
                                        await Ui.getConfirmationModal("Remove PayPal mail", "Are you sure you want to remove your paypal mail? You'll have to add it again manually.", "Yes", "No", async () => {
                                            await Api.updateUserSetting(UserSettings.paypalMail, "");
                                            notify("PayPal mail removed", NotificationType.success);
                                            paypalMailExists$.value = false;
                                        }, () => {
                                        }, "warning");
                                    }
                                })),
                                when(paypalMailExists$, button({
                                    text: compute(ri => ri ? `Request payout to ${anonymize(ri.paypalMail, 2, 8)}` : '', royaltyInfo),
                                    icon: {icon: "mintmark"},
                                    classes: ["positive"],
                                    onclick: async () => {
                                        await Ui.getConfirmationModal("Request payment", "Are you sure you want to request a payment?", "Yes", "No", async () => {
                                            await Api.requestPayout();
                                            notify("Payment requested", NotificationType.success);
                                            reload();
                                        }, () => {
                                        }, "wallet");
                                    }
                                })),
                            ).build())
                    ).build()
            ).build();
    }

    static royaltyInfo(royaltyInfo: RoyaltyInfo) {
        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("card", "secondary", "flex-v")
                    .children(
                        create("h1")
                            .text(currency(royaltyInfo.available))
                            .title(royaltyInfo.available < 0.5 ? "You need at least 50ct to request a payment" : "")
                            .build(),
                        create("span")
                            .text("Available")
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(currency(royaltyInfo.totalRoyalties) + " Total royalties")
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(currency(royaltyInfo.paidTotal) + " paid out")
                            .build(),
                        create("span")
                            .classes("text-small")
                            .text(currency(royaltyInfo.meanTrackRoyalty) + " average track royalty")
                            .build(),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        ChartTemplates.boxPlotChart([royaltyInfo.trackRoyaltyValues], "Average track royalty", "averageTrackRoyaltyChart")
                    ).build(),
            ).build();
    }

    static dataExport() {
        const offset = signal(0);
        const month = compute(yearAndMonthByOffset, offset);
        const types = ["excel", "csv", "json"];
        const selectedTypeIndex = signal(0);

        return create("div")
            .classes("flex-v", "card")
            .children(
                create("div")
                    .classes("flex-v")
                    .children(
                        create("h1")
                            .text("Royalty data export")
                            .build(),
                        create("span")
                            .text(compute(m => `Month: ${m.year}-${m.month}`, month))
                            .build(),
                        create("div")
                            .classes("flex")
                            .children(
                                GenericTemplates.combinedSelector(types, (i: number) => selectedTypeIndex.value = i, 0),
                                button({
                                    text: "Download",
                                    icon: {icon: "download"},
                                    onclick: async () => {
                                        const royalties = await Api.getRoyaltiesForExport(month.value, types[selectedTypeIndex.value]);
                                        if (royalties) {
                                            let extension = types[selectedTypeIndex.value];
                                            if (extension === "excel") {
                                                extension = "xlsx";
                                            }
                                            downloadFile(`Lyda Royalties ${month.value.year}-${month.value.month}.${extension}`, royalties);
                                        }
                                    }
                                })
                            ).build()
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        button({
                            text: "Previous",
                            icon: {icon: "skip_previous"},
                            onclick: () => offset.value += 1
                        }),
                        button({
                            text: "Next",
                            icon: {icon: "skip_next"},
                            onclick: () => offset.value -= 1
                        }),
                        button({
                            text: "Current",
                            icon: {icon: "today"},
                            onclick: () => offset.value = 0
                        }),
                    ).build()
            ).build();
    }
}
