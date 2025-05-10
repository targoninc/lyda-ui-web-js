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
import {ChartTemplates, usedColors} from "./generic/ChartTemplates.ts";

export class StatisticTemplates {
    static playCountByTrackChart(trackNames: string[], playCounts: number[], trackColors = usedColors) {
        if (trackNames.length === 0) {
            return ChartTemplates.noData("Play count by track");
        }
        return ChartTemplates.donutChart(trackNames, playCounts, "Plays", "Play count by track", "playCountByTrackChart", trackColors);
    }

    static playCountByMonthChart(monthNames: string[], playCounts: number[], trackColors = usedColors) {
        if (monthNames.length === 0) {
            return ChartTemplates.noData("Play count by month");
        }
        return ChartTemplates.barChart(monthNames, playCounts, "Plays", "Play count by month", "playCountByMonthChart", [trackColors[0]]);
    }

    static likesByTrackChart(trackNames: string[], likeCounts: number[], trackColors = usedColors) {
        if (trackNames.length === 0) {
            return ChartTemplates.noData("Likes by track");
        }
        return ChartTemplates.donutChart(trackNames, likeCounts, "Likes", "Likes by track", "likesByTrackChart", trackColors);
    }

    static activityByTimeChart(labels: string[], values: number[], title: string) {
        const id = Math.floor(Math.random() * 1000);
        return ChartTemplates.barChart(labels, values, title, `${title} by time`, `activityByTimeChart-${id}`, usedColors);
    }

    static royaltiesByMonthChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return ChartTemplates.noData("Royalties by month");
        }
        return ChartTemplates.barChart(labels, values, "Royalties", "Royalties by month", "royaltiesByMonthChart", [usedColors[8]]);
    }

    static royaltiesByTrackChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return ChartTemplates.noData("Royalties by track");
        }
        return ChartTemplates.donutChart(labels, values, "Royalties", "Royalties by track", "royaltiesByTrackChart", usedColors);
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
                                            key: UserSettings.paypalMail,
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
                    ).build(),
                create("div")
                    .classes("card", "secondary", "flex-v")
                    .children(
                        create("h1")
                            .text(currency(royaltyInfo.totalRoyalties))
                            .build(),
                        create("span")
                            .text("Total royalties")
                            .build(),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        create("span")
                            .classes("royalty-info-text", "card", "secondary")
                            .text(currency(royaltyInfo.paidTotal) + " paid out")
                            .build(),
                        create("span")
                            .classes("royalty-info-text", "card", "secondary")
                            .text(currency(royaltyInfo.meanTrackRoyalty) + " average track royalty")
                            .build(),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        ChartTemplates.boxPlotChart([royaltyInfo.trackRoyaltyValues], "Average track royalty", "averageTrackRoyaltyChart", usedColors)
                    ).build(),
            ).build();
    }
}