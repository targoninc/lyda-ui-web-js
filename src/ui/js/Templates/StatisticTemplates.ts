import {create, ifjs} from "../../fjsc/src/f2.ts";
import {RoyaltyInfo} from "../Models/RoyaltyInfo.ts";
import {currency} from "../Classes/Helpers/Num.ts";
import {signal} from "../../fjsc/src/signals.ts";
import {GenericTemplates} from "./generic/GenericTemplates.ts";
import {Icons} from "../Enums/Icons.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {Api} from "../Api/Api.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {UserSettings} from "../Enums/UserSettings.ts";
import {getErrorMessage} from "../Classes/Util.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {ChartTemplates} from "./generic/ChartTemplates.ts";

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

    static artistRoyaltyActions(royaltyInfo: any) {
        const hasPayableRoyalties = royaltyInfo.available && parseFloat(royaltyInfo.available) >= 0.5;
        const paypalMailExistsState = signal(royaltyInfo.paypalMail !== null);
        const visibilityClass = signal(paypalMailExistsState.value ? "visible" : "hidden");
        const invertVisibilityClass = signal(paypalMailExistsState.value ? "hidden" : "visible");
        paypalMailExistsState.onUpdate = (exists) => {
            visibilityClass.value = exists ? "visible" : "hidden";
            invertVisibilityClass.value = exists ? "hidden" : "visible";
        };

        return create("div")
            .classes("flex-v", "card")
            .children(
                StatisticTemplates.royaltyInfo(royaltyInfo),
                create("div")
                    .classes("flex")
                    .children(
                        ifjs(hasPayableRoyalties, create("div")
                            .classes("flex")
                            .children(
                                GenericTemplates.action(Icons.PAYPAL, "Set PayPal mail", "setPaypalMail", async () => {
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
                                        paypalMailExistsState.value = true;
                                    }, () => {
                                    }, Icons.PAYPAL);
                                }, [], [invertVisibilityClass, "secondary"]),
                                GenericTemplates.action(Icons.PAYPAL, "Remove PayPal mail", "removePaypalMail", async () => {
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
                                        paypalMailExistsState.value = false;
                                    }, () => {
                                    }, Icons.WARNING);
                                }, [], [visibilityClass, "secondary"]),
                                GenericTemplates.action(Icons.PAY, "Request payout", "requestPayout", async () => {
                                    const res = await Api.postAsync(ApiRoutes.requestPayout);
                                    if (res.code !== 200) {
                                        notify(getErrorMessage(res), NotificationType.error);
                                        return;
                                    }
                                    notify("Payment requested", NotificationType.success);
                                }, [], [visibilityClass, "secondary"])
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
}