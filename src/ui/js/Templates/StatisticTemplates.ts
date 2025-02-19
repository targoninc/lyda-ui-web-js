import {Chart, registerables} from "chart.js";
import {BoxPlotChart} from "@sgratzl/chartjs-chart-boxplot";
import {create, HtmlPropertyValue} from "../../fjsc/src/f2.ts";
import {Colors} from "../Classes/Colors.ts";
import {ChartOptions} from "../Classes/ChartOptions.ts";

Chart.register(...registerables);

export const usedColors = Colors.themedList;

export class StatisticTemplates {
    static donutChart(labels: string[], values: number[], valueTitle: string, title: string, id: string, colors = usedColors) {
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
            .classes("chart-container", "card", "flex-v")
            .children(
                create("h4")
                    .classes("chart-title")
                    .text(title)
                    .build(),
                ctx,
            ).build();
    }

    static barChart(labels: string[], values: number[], valueTitle: string, title: string, id: string, colors = usedColors) {
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
            .classes("chart-container-full", "card", "flex-v")
            .children(
                create("h4")
                    .classes("chart-title")
                    .text(title)
                    .build(),
                ctx,
            ).build();
    }

    static boxPlotChart(values: number[], title: string, id: string, colors = usedColors) {
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
            .classes("chart-container-vertical", "card", "flex-v")
            .children(
                ctx,
            ).build();
    }

    static noData(title: HtmlPropertyValue) {
        return create("div")
            .classes("chart-container", "card", "flex-v")
            .children(
                create("h4")
                    .classes("chart-title")
                    .text(title)
                    .build(),
                create("div")
                    .classes("flex", "align-center", "chart")
                    .children(
                        create("span")
                            .text("No data yet")
                            .build()
                    ).build(),
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

    static activityByTimeChart(labels: string[], values: number[], title: string) {
        const id = Math.floor(Math.random() * 1000);
        return StatisticTemplates.barChart(labels, values, title, `${title} by time`, `activityByTimeChart-${id}`, usedColors);
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