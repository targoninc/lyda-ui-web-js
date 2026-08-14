import { compute, create, HtmlPropertyValue, nullElement, signal } from "@targoninc/jess";
import { button } from "@targoninc/jess-components";
import { Statistic } from "@targoninc/lyda-shared/src/Models/Statistic";
import { BoxPlotValues } from "@targoninc/lyda-shared/src/Models/BoxPlotValues";
import { Api } from "../../Api/Api.ts";
import {
    barChart as svgBarChart,
    boxPlotChart as svgBoxPlotChart,
    buildStatisticMetadata,

    lineChart as svgLineChart,
    metadataTable,
} from "../../Classes/SvgChart.ts";
import { ChartDatum } from "../../Models/ChartDatum.ts";
import { MetadataRow } from "../../Models/MetadataRow.ts";
import { PaginatedLineChartOptions } from "../../Models/PaginatedLineChartOptions.ts";
import { t } from "../../../locales";

export class ChartTemplates {
    static barChart(
        labels: string[],
        values: number[],
        valueTitle: string,
        title: string,
        id: string,
        metadata?: MetadataRow[],
    ) {
        const data: ChartDatum[] = labels.map((label, i) => ({ label, value: values[i] ?? 0 }));
        const chart = svgBarChart(data, id, { valueTitle, title });
        return create("div")
            .classes("chart-container-full", "card", "flex-v")
            .children(
                create("h4").classes("chart-title").text(title).build(),
                chart,
                ...(metadata && metadata.length > 0 ? [metadataTable(metadata)] : []),
            ).build();
    }

    static lineChart(
        labels: string[],
        values: number[],
        valueTitle: string,
        title: string,
        id: string,
        metadata?: MetadataRow[],
    ) {
        const data: ChartDatum[] = labels.map((label, i) => ({ label, value: values[i] ?? 0 }));
        const chart = svgLineChart(data, id, {
            valueTitle,
            title,
        });
        return create("div")
            .classes("chart-container-full", "card", "flex-v")
            .children(
                create("h4").classes("chart-title").text(title).build(),
                chart,
                ...(metadata && metadata.length > 0 ? [metadataTable(metadata)] : []),
            ).build();
    }

    static boxPlotChart(values: BoxPlotValues, title: string, id: string, metadata?: MetadataRow[]) {
        const chart = svgBoxPlotChart(values, id, { title });
        return create("div")
            .classes("chart-container-vertical", "flex-v")
            .children(
                chart,
                ...(metadata && metadata.length > 0 ? [metadataTable(metadata)] : []),
            ).build();
    }

    static noData(title: HtmlPropertyValue) {
        return create("div")
            .classes("chart-container", "card", "flex-v")
            .children(
                create("h4").classes("chart-title").text(title).build(),
                create("div")
                    .classes("flex", "align-center", "chart")
                    .children(
                        create("span")
                            .text(t("NO_DATA_YET"))
                            .build()
                    ).build(),
            ).build();
    }

    static paginatedLineChart(options: PaginatedLineChartOptions) {
        const skip = signal(0);
        const take = signal(12);
        const data = signal<Statistic[]>([]);
        const update = async () => {
            try {
                data.value = (await Api.getStatistic(options.endpoint, options.params, skip.value, take.value)) ?? [];
            } catch {
                data.value = [];
            }
        };
        skip.subscribe(update);
        take.subscribe(update);
        update().then();

        const id = options.title.replaceAll(/\s/g, "").toLowerCase();

        const chart = compute((d: Statistic[]) => {
            if (d.length === 0) {
                return create("div")
                    .classes("chart-empty")
                    .children(
                        create("span")
                            .text(t("NO_DATA_YET"))
                            .build()
                    ).build();
            }
            const chartData: ChartDatum[] = d.map(e => ({ label: e.label, value: e.value }));
            return svgLineChart(chartData, id, {
                valueTitle: options.title,
                title: options.title,
            });
        }, data);

        const metadata = compute((d: Statistic[]) => {
            if (d.length === 0) {
                return nullElement();
            }
            const chartData: ChartDatum[] = d.map(e => ({ label: e.label, value: e.value }));
            return metadataTable(buildStatisticMetadata(chartData, options.cumulative ?? false));
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
                        }),
                    )
                    .build(),
                chart,
                metadata,
            ).build();
    }
}

function getNextByTimeType(timeType?: "year" | "month" | "day" | string) {
    switch (timeType) {
        case "year":
            return t("NEXT_YEAR");
        default:
            return t("NEXT_MONTH");
    }
}

function getPreviousByTimeType(timeType?: "year" | "month" | "day" | string) {
    switch (timeType) {
        case "year":
            return t("PREVIOUS_YEAR");
        default:
            return t("PREVIOUS_MONTH");
    }
}
