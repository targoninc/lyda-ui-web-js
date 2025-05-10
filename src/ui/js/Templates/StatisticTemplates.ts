import {create, ifjs} from "../../fjsc/src/f2.ts";
import {RoyaltyInfo} from "../Models/RoyaltyInfo.ts";
import {currency} from "../Classes/Helpers/Num.ts";
import {compute, signal} from "../../fjsc/src/signals.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {Api} from "../Api/Api.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {UserSettings} from "../Enums/UserSettings.ts";
import {downloadFile, getErrorMessage} from "../Classes/Util.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {ChartTemplates} from "./generic/ChartTemplates.ts";
import {FJSC} from "../../fjsc";
import {anonymize} from "../Classes/Helpers/CustomText.ts";
import {navigate, reload} from "../Routing/Router.ts";
import {StatisticsWrapper} from "../Classes/StatisticsWrapper.ts";
import {permissions} from "../state.ts";
import {RoutePath} from "../Routing/routes.ts";
import {yearAndMonthByOffset} from "../Classes/Helpers/Date.ts";
import {Royalty} from "../Models/Royalty.ts";
import { exportToFile, ExportType } from "@targoninc/data-exporter";
import {GenericTemplates} from "./generic/GenericTemplates.ts";

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
        return create("div")
            .classes("flex", "fullWidth")
            .children(
                ...(await StatisticsWrapper.getStatistics(permissions.value))
            ).build();
    }

    static artistRoyaltyActions(royaltyInfo: any) {
        const hasPayableRoyalties = royaltyInfo.available && parseFloat(royaltyInfo.available) >= 0.5;
        const paypalMailExists$ = signal(royaltyInfo.paypalMail !== null);

        return create("div")
            .classes("flex-v", "card")
            .children(
                StatisticTemplates.royaltyInfo(royaltyInfo),
                create("div")
                    .classes("flex")
                    .children(
                        FJSC.button({
                            text: "Payout history",
                            icon: {icon: "account_balance"},
                            onclick: () => navigate(RoutePath.payouts)
                        }),
                        ifjs(hasPayableRoyalties, create("div")
                            .classes("flex")
                            .children(
                                ifjs(paypalMailExists$, FJSC.button({
                                    text: "Set PayPal mail",
                                    icon: {icon: "mail"},
                                    classes: ["positive"],
                                    onclick: async () => {
                                        await Ui.getTextInputModal("Set PayPal mail", "The account you will receive payments with", "", "Save", "Cancel", async (address: string) => {
                                            const res = await Api.postAsync(ApiRoutes.updateUserSetting, {
                                                setting: UserSettings.paypalMail,
                                                value: address
                                            });
                                            if (res.code !== 200) {
                                                notify(getErrorMessage(res), NotificationType.error);
                                                return;
                                            }
                                            notify("PayPal mail set", NotificationType.success);
                                            paypalMailExists$.value = true;
                                        }, () => {
                                        }, "mail");
                                    }
                                }), true),
                                ifjs(paypalMailExists$, FJSC.button({
                                    text: "Remove PayPal mail",
                                    title: "You won't be able to receive payments until you set a mail address again",
                                    icon: {icon: "unsubscribe"},
                                    classes: ["negative"],
                                    onclick: async () => {
                                        await Ui.getConfirmationModal("Remove PayPal mail", "Are you sure you want to remove your paypal mail? You'll have to add it again manually.", "Yes", "No", async () => {
                                            const res = await Api.postAsync(ApiRoutes.updateUserSetting, {
                                                setting: "paypalMail",
                                                value: ""
                                            });
                                            if (res.code !== 200) {
                                                notify(getErrorMessage(res), NotificationType.error);
                                                return;
                                            }
                                            notify("PayPal mail removed", NotificationType.success);
                                            paypalMailExists$.value = false;
                                        }, () => {
                                        }, "warning");
                                    }
                                })),
                                ifjs(paypalMailExists$, FJSC.button({
                                    text: `Request payout to ${anonymize(royaltyInfo.paypalMail, 2, 8)}`,
                                    icon: {icon: "mintmark"},
                                    classes: ["positive"],
                                    onclick: async () => {
                                        await Ui.getConfirmationModal("Request payment", "Are you sure you want to request a payment?", "Yes", "No", async () => {
                                            const res = await Api.postAsync(ApiRoutes.requestPayout);
                                            if (res.code !== 200) {
                                                notify(getErrorMessage(res), NotificationType.error);
                                                return;
                                            }
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
                                GenericTemplates.tabSelector(types, (i: number) => selectedTypeIndex.value = i, 0),
                                FJSC.button({
                                    text: "Download",
                                    icon: {icon: "download"},
                                    onclick: async () => {
                                        const res = await Api.getAsync<string>(ApiRoutes.royaltiesForExport, {
                                            ...month.value,
                                            type: types[selectedTypeIndex.value]
                                        });
                                        if (res.code !== 200) {
                                            notify(getErrorMessage(res), NotificationType.error);
                                            return;
                                        }

                                        let extension = types[selectedTypeIndex.value];
                                        if (extension === "excel") {
                                            extension = "xlsx";
                                        }
                                        downloadFile(`Lyda Royalties ${month.value.year}-${month.value.month}.${extension}`, res.data);
                                    }
                                })
                            ).build()
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        FJSC.button({
                            text: "Previous",
                            icon: {icon: "skip_previous"},
                            onclick: () => offset.value += 1
                        }),
                        FJSC.button({
                            text: "Next",
                            icon: {icon: "skip_next"},
                            onclick: () => offset.value -= 1
                        }),
                        FJSC.button({
                            text: "Current",
                            icon: {icon: "today"},
                            onclick: () => offset.value = 0
                        }),
                    ).build()
            ).build();
    }
}
