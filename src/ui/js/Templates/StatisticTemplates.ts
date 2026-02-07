import { compute, create, nullElement, signal } from "@targoninc/jess";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { ChartTemplates } from "./generic/ChartTemplates.ts";
import { StatisticsWrapper } from "../Classes/StatisticsWrapper.ts";
import { PayoutTemplates } from "./money/PayoutTemplates.ts";
import { RoyaltyInfo } from "@targoninc/lyda-shared/src/Models/RoyaltyInfo.ts";
import { Api } from "../Api/Api.ts";
import { horizontal, vertical } from "./generic/GenericTemplates.ts";
import { t } from "../../locales";

export class StatisticTemplates {
    static playCountByMonthChart() {
        return ChartTemplates.paginatedBarChart({
            title: `${t("PLAYCOUNT_BY_MONTH")}`,
            endpoint: ApiRoutes.getPlayCountByMonth,
            timeType: "month"
        });
    }

    static royaltiesByMonthChart() {
        return ChartTemplates.paginatedBarChart({
            title: `${t("ROYALTIES_BY_MONTH")}`,
            endpoint: ApiRoutes.getRoyaltiesByMonth,
            timeType: "month"
        });
    }

    static globalPlayCountByMonthChart() {
        return ChartTemplates.paginatedBarChart({
            title: `${t("PLAYCOUNT_BY_MONTH")}`,
            endpoint: ApiRoutes.getGlobalPlayCountByMonth,
            timeType: "month",
        });
    }

    static globalRoyaltiesByMonthChart() {
        return ChartTemplates.paginatedBarChart({
            title: `${t("ROYALTIES_BY_MONTH")}`,
            endpoint: ApiRoutes.getGlobalRoyaltiesByMonth,
            timeType: "month",
        });
    }

    static globalSalesByMonthChart() {
        return ChartTemplates.paginatedBarChart({
            title: `${t("SALES_BY_MONTH")}`,
            endpoint: ApiRoutes.getGlobalSalesByMonth,
            timeType: "month",
        });
    }

    static likesByTrackChart(trackNames: string[], likeCounts: number[]) {
        if (trackNames.length === 0) {
            return ChartTemplates.noData(t("LIKES_BY_TRACK"));
        }
        return ChartTemplates.barChart(trackNames, likeCounts, `${t("LIKES")}`, `${t("LIKES_BY_TRACK")}`, "likesByTrackChart");
    }

    static royaltiesByTrackChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return ChartTemplates.noData(t("ROYALTIES_BY_TRACK"));
        }
        return ChartTemplates.barChart(labels, values, `${t("ROYALTIES")}`, `${t("ROYALTIES_BY_TRACK")}`, "royaltiesByTrackChart");
    }

    static playCountByTrackChart(trackNames: string[], playCounts: number[]) {
        if (trackNames.length === 0) {
            return ChartTemplates.noData(t("PLAYCOUNT_BY_TRACK"));
        }
        return ChartTemplates.barChart(trackNames, playCounts, `${t("PLAYS")}`, `${t("PLAYCOUNT_BY_TRACK")}`, "playCountByTrackChart");
    }

    static allStats() {
        return create("div")
            .classes("flex", "fullWidth")
            .children(
                ...StatisticsWrapper.getStatistics(),
                PayoutTemplates.dataExport(),
            ).build();
    }

    static globalStats() {
        const royaltyInfo = signal<RoyaltyInfo | null>(null);
        Api.getRoyaltyInfo().then(ri => royaltyInfo.value = ri);

        return vertical(
            horizontal(
                compute(ri => ri ? PayoutTemplates.globalRoyaltyInfo(ri) : nullElement(), royaltyInfo),
            ).classes("card"),
            create("div")
                .classes("flex", "fullWidth")
                .children(
                    ...StatisticsWrapper.getGlobalStatistics(),
                ).build(),
        ).build();
    }
}
