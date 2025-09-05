import { Chart, ChartConfiguration, registerables } from "chart.js";
import { BoxPlotChart } from "@sgratzl/chartjs-chart-boxplot";
import { compute, create, HtmlPropertyValue, signal } from "@targoninc/jess";
import { ChartOptions } from "../../Classes/ChartOptions.ts";
import { chartColor } from "../../state.ts";
import { button } from "@targoninc/jess-components";
import { Statistic } from "@targoninc/lyda-shared/src/Models/Statistic";
import { Api } from "../../Api/Api.ts";
import { BoxPlotValues } from "@targoninc/lyda-shared/dist/Models/BoxPlotValues";

Chart.register(...registerables);

export class ChartTemplates {
    static barChart(
        labels: string[],
        values: number[],
        valueTitle: string,
        title: string,
        id: string,
    ) {
        const ctx = create("canvas").classes("chart").id(id).build();

        const data = {
            labels: labels,
            datasets: [
                {
                    label: valueTitle,
                    data: values,
                    backgroundColor: chartColor.value,
                    hoverOffset: 4,
                },
            ],
        };

        const config = {
            type: "bar",
            data: data,
            options: ChartOptions.defaultOptions,
        };

        //@ts-expect-error bc Chart.js stupid
        new Chart(ctx, config);

        return create("div")
            .classes("chart-container-full", "card", "flex-v")
            .children(create("h4").classes("chart-title").text(title).build(), ctx).build();
    }

    static boxPlotChart(values: BoxPlotValues, title: string, id: string) {
        const ctx = create("canvas").classes("chart").id(id).build();

        const data: ChartConfiguration<"boxplot">["data"] = {
            labels: [title],
            datasets: [
                {
                    label: title,
                    data: [values],
                    backgroundColor: chartColor.value,
                    borderColor: chartColor.value,
                },
            ],
        };

        console.log(data);
        const config = {
            type: "boxplot",
            data: data,
            options: ChartOptions.defaultOptions,
        };

        //@ts-expect-error bc Chart.js stupid
        new BoxPlotChart(ctx, config);

        return create("div")
            .classes("chart-container-vertical", "card", "secondary", "flex-v")
            .children(ctx).build();
    }

    static noData(title: HtmlPropertyValue) {
        return create("div")
            .classes("chart-container", "card", "flex-v")
            .children(
                create("h4").classes("chart-title").text(title).build(),
                create("div")
                    .classes("flex", "align-center", "chart")
                    .children(create("span").text("No data yet").build())
                    .build(),
            ).build();
    }

    static async paginatedBarChart(options: PaginatedBarChartOptions) {
        const skip = signal(0);
        const take = signal(12);
        const data = signal<Statistic[]>([]);
        const update = async () => {
            data.value = (await Api.getStatistic(options.endpoint, options.params, skip.value, take.value)) ?? [];
        };
        skip.subscribe(update);
        take.subscribe(update);
        update().then();

        const chart = compute((d: Statistic[]) => {
            const ctx = create("canvas")
                .classes("chart")
                .id(options.title.replaceAll(/\s/g, "").toLowerCase())
                .build();

            const data = {
                labels: d.map(e => e.label),
                datasets: [
                    {
                        data: d.map(e => e.value),
                        backgroundColor: chartColor.value,
                        hoverOffset: 4,
                    },
                ],
            };

            const config = {
                type: "bar",
                data: data,
                options: ChartOptions.defaultOptions,
            };

            //@ts-expect-error bc Chart.js stupid
            new Chart(ctx, config);

            return ctx;
        }, data);

        return create("div")
            .classes("chart-container-full", "card", "flex-v")
            .children(
                create("h4").classes("chart-title").text(options.title).build(),
                create("div")
                    .classes("flex", "align-children")
                    .children(
                        button({
                            text: getPreviousByTimeType(options.timeType),
                            icon: { icon: "arrow_left" },
                            onclick: () => (skip.value = skip.value + take.value),
                        }),
                        button({
                            text: getNextByTimeType(options.timeType),
                            icon: { icon: "arrow_right" },
                            onclick: () => (skip.value = Math.max(0, skip.value - take.value)),
                            disabled: compute(s => s <= 0, skip),
                            classes: ["previousPage"],
                        }),
                    )
                    .build(),
                chart,
            ).build();
    }
}

export interface PaginatedBarChartOptions {
    title: string;
    endpoint: string;
    params?: Record<string, any>;
    timeType?: "year" | "month" | "day" | string;
}

function getNextByTimeType(timeType?: "year" | "month" | "day" | string) {
    switch (timeType) {
        case "year":
            return "Next decade";
        case "month":
            return "Next year";
        case "day":
            return "Next month";
        default:
            return "Next";
    }
}

function getPreviousByTimeType(timeType?: "year" | "month" | "day" | string) {
    switch (timeType) {
        case "year":
            return "Previous decade";
        case "month":
            return "Previous year";
        case "day":
            return "Previous month";
        default:
            return "Previous";
    }
}
