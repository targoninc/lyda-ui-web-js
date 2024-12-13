import {Chart, registerables} from "chart.js";
import {BoxPlotChart} from "@sgratzl/chartjs-chart-boxplot";
import {create, HtmlPropertyValue} from "../../fjsc/src/f2.ts";
import {Colors} from "../Classes/Colors.ts";
import {ChartOptions} from "../Classes/ChartOptions.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {Icons} from "../Enums/Icons.js";
import {Api} from "../Api/Api.ts";
import {Num} from "../Classes/Helpers/Num.ts";
import {Permissions} from "../Enums/Permissions.ts";
import {FormTemplates} from "./FormTemplates.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {signal} from "../../fjsc/src/signals.ts";
import {User} from "../Models/DbModels/User.ts";

Chart.register(...registerables);

const usedColors = Colors.themedList;

export class StatisticTemplates {
    static donutChart(labels, values, valueTitle, title, id, colors = usedColors) {
        const ctx = create("canvas")
            .classes("chart")
            .id(id)
            .build();

        const data = {
            labels: labels,
            datasets: [{
                label: valueTitle,
                data: values,
                backgroundColor: colors,
                hoverOffset: 4
            }]
        };

        const config = {
            type: "doughnut",
            data: data,
            options: {
                ...ChartOptions.defaultOptions,
                ...ChartOptions.noGridOptions
            }
        };

        new Chart(ctx, config);

        return create("div")
            .classes("chart-container", "flex-v")
            .children(
                create("h4")
                    .classes("chart-title")
                    .text(title)
                    .build(),
                ctx,
            ).build();
    }

    static barChart(labels, values, valueTitle, title, id, colors = usedColors) {
        const ctx = create("canvas")
            .classes("chart")
            .id(id)
            .build();

        const data = {
            labels: labels,
            datasets: [{
                label: valueTitle,
                data: values,
                backgroundColor: colors,
                hoverOffset: 4
            }]
        };

        const config = {
            type: "bar",
            data: data,
            options: ChartOptions.defaultOptions
        };

        new Chart(ctx, config);

        return create("div")
            .classes("chart-container-full", "flex-v")
            .children(
                create("h4")
                    .classes("chart-title")
                    .text(title)
                    .build(),
                ctx,
            ).build();
    }

    static boxPlotChart(values, title, id, colors = usedColors) {
        const ctx = create("canvas")
            .classes("chart")
            .id(id)
            .build();

        const data = {
            labels: [title],
            datasets: [{
                label: title,
                data: values,
                backgroundColor: colors,
                borderColor: colors,
                hoverOffset: 4
            }]
        };

        const config = {
            type: "boxplot",
            data: data,
            options: ChartOptions.defaultOptions
        };

        new BoxPlotChart(ctx, config);

        return create("div")
            .classes("chart-container-vertical", "flex-v")
            .children(
                ctx,
            ).build();
    }

    static noData(title: HtmlPropertyValue) {
        return create("div")
            .classes("chart-container", "flex-v")
            .children(
                create("h4")
                    .classes("chart-title")
                    .text(title)
                    .build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        create("span")
                            .text("No data yet")
                            .build()
                    )
                    .build(),
            ).build();
    }

    static playCountByTrackChart(trackNames: string[], playCounts: number[], trackColors = usedColors) {
        if (trackNames.length === 0) {
            return StatisticTemplates.noData("Play count by track");
        }
        return StatisticTemplates.donutChart(trackNames, playCounts, "Plays", "Play count by track", "playCountByTrackChart", trackColors);
    }

    static playCountByMonthChart(monthNames: string[], playCounts: number[], trackColors = usedColors) {
        if (monthNames.length === 0) {
            return StatisticTemplates.noData("Play count by month");
        }
        return StatisticTemplates.barChart(monthNames, playCounts, "Plays", "Play count by month", "playCountByMonthChart", [trackColors[0]]);
    }

    static likesByTrackChart(trackNames: string[], likeCounts: number[], trackColors = usedColors) {
        if (trackNames.length === 0) {
            return StatisticTemplates.noData("Likes by track");
        }
        return StatisticTemplates.donutChart(trackNames, likeCounts, "Likes", "Likes by track", "likesByTrackChart", trackColors);
    }

    static royaltyCalculator(royaltyInfo) {
        if (!royaltyInfo.calculatableMonths) {
            return [];
        }

        const months = royaltyInfo.calculatableMonths.map(m => {
            return {
                value: m.month,
                text: m.month + (m.calculated ? " (calculated)" : "")
            };
        });
        const selectedState = signal(months[0]);

        return [
            FormTemplates.dropDownField("Month", months, selectedState),
            GenericTemplates.action(Icons.CALCULATE, "Calculate royalties", "calculateRoyalties", async () => {
                const res = await Api.postAsync(ApiRoutes.calculateRoyalties, {
                    month: selectedState.value
                });
                if (res.code !== 200) {
                    notify(res.data, "error");
                    return;
                }
                notify("Royalties calculated");
            }),
        ];
    }

    static statisticActions(user: User, royaltyInfo, permissions) {
        let actions = [];

        if (permissions.find(p => p.name === Permissions.canCalculateRoyalties)) {
            actions = actions.concat(StatisticTemplates.royaltyCalculator(royaltyInfo));
        }

        if (royaltyInfo.available && parseFloat(royaltyInfo.available) >= 0.5) {
            const paypalMailExistsState = signal(royaltyInfo.paypalMail !== null);
            const visibilityClass = signal(paypalMailExistsState.value ? "visible" : "hidden");
            const invertVisibilityClass = signal(paypalMailExistsState.value ? "hidden" : "visible");
            paypalMailExistsState.onUpdate = (exists) => {
                visibilityClass.value = exists ? "visible" : "hidden";
                invertVisibilityClass.value = exists ? "hidden" : "visible";
            };

            actions.push(GenericTemplates.action(Icons.PAYPAL, "Set PayPal mail", "setPaypalMail", async () => {
                await Ui.getTextInputModal("Set PayPal mail", "The account you will receive payments with", "", "Save", "Cancel", async (address) => {
                    const res = await Api.postAsync(ApiRoutes.updateUser, {address});
                    if (res.code !== 200) {
                        notify(res.data, "error");
                        return;
                    }
                    notify("PayPal mail set", "success");
                    paypalMailExistsState.value = true;
                }, () => {
                }, Icons.PAYPAL);
            }, [], [invertVisibilityClass, "secondary"]));
            actions.push(GenericTemplates.action(Icons.PAYPAL, "Remove PayPal mail", "removePaypalMail", async () => {
                await Ui.getConfirmationModal("Remove PayPal mail", "Are you sure you want to remove your paypal mail? You'll have to add it again manually.", "Yes", "No", async () => {
                    const res = await Api.postAsync(ApiRoutes.updateUserSetting, {
                        setting: "paypalMail",
                        value: ""
                    });
                    if (res.code !== 200) {
                        notify(res.data, "error");
                        return;
                    }
                    notify("PayPal mail removed");
                    paypalMailExistsState.value = false;
                }, () => {
                }, Icons.WARNING);
            }, [], [visibilityClass, "secondary"]));
            actions.push(GenericTemplates.action(Icons.PAY, "Request payment", "requestPayment", async () => {
                const res = await Api.postAsync(ApiRoutes.requestPayment);
                if (res.code !== 200) {
                    notify(res.data, "error");
                    return;
                }
                notify("Payment requested", "success");
            }, [], [visibilityClass, "secondary"]));
        }

        return create("div")
            .classes("flex-v", "card")
            .children(
                StatisticTemplates.royaltyInfo(royaltyInfo),
                create("div")
                    .classes("flex")
                    .children(...actions)
                    .build()
            ).build();
    }

    static royaltyInfo(royaltyInfo) {
        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("card", "secondary", "flex-v")
                    .children(
                        create("h1")
                            .text(Num.currency(royaltyInfo.available))
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
                            .text(Num.currency(royaltyInfo.totalRoyalties))
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
                            .text(Num.currency(royaltyInfo.paidTotal) + " paid out")
                            .build(),
                        create("span")
                            .classes("royalty-info-text", "card", "secondary")
                            .text(Num.currency(royaltyInfo.meanTrackRoyalty) + " average track royalty")
                            .build(),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        StatisticTemplates.boxPlotChart([royaltyInfo.trackRoyaltyValues], "Average track royalty", "averageTrackRoyaltyChart", usedColors)
                    ).build(),
            ).build();
    }

    static royaltiesByMonthChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return StatisticTemplates.noData("Royalties by month");
        }
        return StatisticTemplates.barChart(labels, values, "Royalties", "Royalties by month", "royaltiesByMonthChart", [usedColors[8]]);
    }

    static royaltiesByTrackChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return StatisticTemplates.noData("Royalties by track");
        }
        return StatisticTemplates.donutChart(labels, values, "Royalties", "Royalties by track", "royaltiesByTrackChart", usedColors);
    }
}