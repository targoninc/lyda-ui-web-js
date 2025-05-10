import {Chart, registerables} from "chart.js";
import {BoxPlotChart} from "@sgratzl/chartjs-chart-boxplot";
import {create, HtmlPropertyValue} from "../../../fjsc/src/f2.ts";
import {ChartOptions} from "../../Classes/ChartOptions.ts";
import {Colors} from "../../Classes/Colors.ts";
import {asyncCompute, compute, signal} from "../../../fjsc/src/signals.ts";
import {Statistic} from "../../Models/Statistic.ts";
import {Api} from "../../Api/Api.ts";
import {FJSC} from "../../../fjsc";

Chart.register(...registerables);

export const usedColors = Colors.themedList;

export class ChartTemplates {
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

    static async paginatedBarChart(title: string, endpoint: string, params: Record<string, any> = {}) {
        const skip = signal(0);
        const take = signal(12);
        const data = await asyncCompute(async (s, t) => {
            const res = await Api.getAsync<Statistic[]>(endpoint, {
                ...params,
                offset: s,
                limit: t,
            });

            return res.code === 200 ? res.data as Statistic[] : [];
        }, skip, take);
        const chart = compute((d: Statistic[]) => {
            const ctx = create("canvas")
                .classes("chart")
                .id(title.replaceAll(/\s/g, "").toLowerCase())
                .build();

            const data = {
                labels: d.map(e => e.label),
                datasets: [{
                    label: "values",
                    data: d.map(e => e.value),
                    backgroundColor: "grey",
                    hoverOffset: 4
                }]
            };

            const config = {
                type: "bar",
                data: data,
                options: ChartOptions.defaultOptions
            };

            new Chart(ctx, config);

            return ctx;
        }, data);

        return create("div")
            .classes("chart-container-full", "card", "flex-v")
            .children(
                create("h4")
                    .classes("chart-title")
                    .text(title)
                    .build(),
                create("div")
                    .classes("flex", "align-children")
                    .children(
                        FJSC.button({
                            text: "Previous page",
                            icon: { icon: "arrow_left" },
                            onclick: () => skip.value = Math.max(0, skip.value - take.value),
                            disabled: compute(s => s <= 0, skip),
                            classes: ["previousPage"],
                        }),
                        FJSC.button({
                            text: "Next page",
                            icon: { icon: "arrow_right" },
                            onclick: () => skip.value = skip.value + take.value,
                        }),
                    ).build(),
                chart,
            ).build();
    }
}