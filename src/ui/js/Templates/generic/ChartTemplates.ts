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
        currency?: boolean,
    ) {
        const data: ChartDatum[] = labels.map((label, i) => ({ label, value: values[i] ?? 0 }));
        const chart = svgBarChart(data, id, { valueTitle, title, currency });
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
        currency?: boolean,
    ) {
        const data: ChartDatum[] = labels.map((label, i) => ({ label, value: values[i] ?? 0 }));
        const chart = svgLineChart(data, id, {
            valueTitle,
            title,
            currency,
        });
        return create("div")
            .classes("chart-container-full", "card", "flex-v")
            .children(
                create("h4").classes("chart-title").text(title).build(),
                chart,
                ...(metadata && metadata.length > 0 ? [metadataTable(metadata)] : []),
            ).build();
    }

    static boxPlotChart(values: BoxPlotValues | null | undefined, title: string, id: string, metadata?: MetadataRow[], currency?: boolean) {
        if (!values || ![values.min, values.q1, values.median, values.q3, values.max].every(v => Number.isFinite(v))) {
            return ChartTemplates.noData(title);
        }
        const chart = svgBoxPlotChart(values, id, { title, currency });
        return create("div")
            .classes("chart-container-vertical", "card", "flex-v")
            .children(
                create("h4").classes("chart-title").text(title).build(),
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
                currency: options.currency,
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
                            text: getPreviousStepLabel(options.timeType, take.value),
                            icon: { icon: "arrow_left" },
                            onclick: () => (skip.value = skip.value + take.value),
                        }),
                        button({
                            text: getNextStepLabel(options.timeType, take.value),
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

function getNextStepLabel(timeType?: "year" | "month" | "day" | string, take = 1) {
    switch (paginationStep(timeType, take)) {
        case "day":
            return t("NEXT_DAY");
        case "year":
            return t("NEXT_YEAR");
        case "decade":
            return t("NEXT_DECADE");
        case "century":
            return t("NEXT_CENTURY");
        default:
            return t("NEXT_MONTH");
    }
}

function getPreviousStepLabel(timeType?: "year" | "month" | "day" | string, take = 1) {
    switch (paginationStep(timeType, take)) {
        case "day":
            return t("PREVIOUS_DAY");
        case "year":
            return t("PREVIOUS_YEAR");
        case "decade":
            return t("PREVIOUS_DECADE");
        case "century":
            return t("PREVIOUS_CENTURY");
        default:
            return t("PREVIOUS_MONTH");
    }
}

/**
 * The page step in human terms, derived from the bucket size and the number of
 * buckets per page. E.g. 12 monthly buckets advance the window by a year.
 */
function paginationStep(timeType?: "year" | "month" | "day" | string, take = 1): "day" | "month" | "year" | "decade" | "century" {
    switch (timeType) {
        case "day":
            if (take >= 365) {
                return "year";
            }
            if (take >= 28) {
                return "month";
            }
            return "day";
        case "year":
            if (take >= 100) {
                return "century";
            }
            if (take >= 10) {
                return "decade";
            }
            return "year";
        default:
            if (take >= 120) {
                return "decade";
            }
            if (take >= 12 && take % 12 === 0) {
                return "year";
            }
            return "month";
    }
}
