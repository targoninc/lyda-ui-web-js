import {Chart, registerables} from "https://cdn.jsdelivr.net/npm/chart.js@4.3.0/+esm";
import {BoxPlotChart} from "https://cdn.jsdelivr.net/npm/@sgratzl/chartjs-chart-boxplot@4.2.7/+esm";
import {create, signal} from "https://fjs.targoninc.com/f.js";
import {Colors} from "../Classes/Colors.mjs";
import {ChartOptions} from "../Classes/ChartOptions.mjs";
import {GenericTemplates} from "./GenericTemplates.mjs";
import {Icons} from "../Enums/Icons.mjs";
import {Api} from "../Classes/Api.mjs";
import {Num} from "../Classes/Helpers/Num.mjs";
import {Permissions} from "../Enums/Permissions.mjs";
import {FormTemplates} from "./FormTemplates.mjs";
import {Ui} from "../Classes/Ui.mjs";

Chart.register(...registerables);

export class StatisticTemplates {
    static usedColors = Colors.themedList;

    static donutChart(labels, values, valueTitle, title, id, colors = this.usedColors) {
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

    static barChart(labels, values, valueTitle, title, id, colors = this.usedColors) {
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

    static boxPlotChart(values, title, id, colors = this.usedColors) {
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

    static noData(title) {
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

    static playCountByTrackChart(trackNames, playCounts, trackColors = this.usedColors) {
        if (trackNames.length === 0) {
            return StatisticTemplates.noData("Play count by track");
        }
        return StatisticTemplates.donutChart(trackNames, playCounts, "Plays", "Play count by track", "playCountByTrackChart", trackColors);
    }

    static playCountByMonthChart(monthNames, playCounts, trackColors = this.usedColors) {
        if (monthNames.length === 0) {
            return StatisticTemplates.noData("Play count by month");
        }
        return StatisticTemplates.barChart(monthNames, playCounts, "Plays", "Play count by month", "playCountByMonthChart", [trackColors[0]]);
    }

    static likesByTrackChart(trackNames, likeCounts, trackColors = this.usedColors) {
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
            FormTemplates.dropDownField("Month", "month", months, selectedState, true, (value) => {
                selectedState.value = value;
            }),
            GenericTemplates.action(Icons.CALCULATE, "Calculate royalties", "calculateRoyalties", async () => {
                const res = await Api.postAsync(Api.endpoints.royalties.calculateRoyalties, {
                    month: selectedState.value
                });
                if (res.code !== 200) {
                    Ui.notify(res.data, "error");
                    return;
                }
                Ui.notify("Royalties calculated");
            }),
        ];
    }

    static statisticActions(user, royaltyInfo, permissions) {
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
                    const res = await Api.postAsync(Api.endpoints.user.set.paypalMail, {address});
                    if (res.code !== 200) {
                        Ui.notify(res.data, "error");
                        return;
                    }
                    Ui.notify("PayPal mail set", "success");
                    paypalMailExistsState.value = true;
                }, () => {}, Icons.PAYPAL);
            }, [], [invertVisibilityClass, "secondary"]));
            actions.push(GenericTemplates.action(Icons.PAYPAL, "Remove PayPal mail", "removePaypalMail", async () => {
                await Ui.getConfirmationModal("Remove PayPal mail", "Are you sure you want to remove your paypal mail? You'll have to add it again manually.", "Yes", "No", async () => {
                    const res = await Api.postAsync(Api.endpoints.user.remove.paypalMail);
                    if (res.code !== 200) {
                        Ui.notify(res.data, "error");
                        return;
                    }
                    Ui.notify("PayPal mail removed");
                    paypalMailExistsState.value = false;
                }, () => {}, Icons.WARNING);
            }, [], [visibilityClass, "secondary"]));
            actions.push(GenericTemplates.action(Icons.PAY, "Request payment", "requestPayment", async () => {
                const res = await Api.postAsync(Api.endpoints.royalties.requestPayment);
                if (res.code !== 200) {
                    Ui.notify(res.data, "error");
                    return;
                }
                Ui.notify("Payment requested", "success");
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
                        StatisticTemplates.boxPlotChart([royaltyInfo.trackRoyaltyValues], "Average track royalty", "averageTrackRoyaltyChart", this.usedColors)
                    ).build(),
            ).build();
    }

    static royaltiesByMonthChart(labels, values) {
        if (labels.length === 0) {
            return StatisticTemplates.noData("Royalties by month");
        }
        return StatisticTemplates.barChart(labels, values, "Royalties", "Royalties by month", "royaltiesByMonthChart", [this.usedColors[8]]);
    }

    static royaltiesByTrackChart(labels, values) {
        if (labels.length === 0) {
            return StatisticTemplates.noData("Royalties by track");
        }
        return StatisticTemplates.donutChart(labels, values, "Royalties", "Royalties by track", "royaltiesByTrackChart", this.usedColors);
    }
}