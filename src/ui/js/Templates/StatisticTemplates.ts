import { AnyElement, compute, create, nullElement, signal, Signal } from "@targoninc/jess";
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
        return ChartTemplates.paginatedLineChart({
            title: `${t("PLAYCOUNT_BY_MONTH")}`,
            endpoint: ApiRoutes.getPlayCountByMonth,
            timeType: "month"
        });
    }

    static royaltiesByMonthChart() {
        return ChartTemplates.paginatedLineChart({
            title: `${t("ROYALTIES_BY_MONTH")}`,
            endpoint: ApiRoutes.getRoyaltiesByMonth,
            currency: true,
        });
    }

    static globalPlayCountByMonthChart() {
        return ChartTemplates.paginatedLineChart({
            title: `${t("PLAYCOUNT_BY_MONTH")}`,
            endpoint: ApiRoutes.getGlobalPlayCountByMonth,
            timeType: "month",
        });
    }

    static globalRoyaltiesByMonthChart() {
        return ChartTemplates.paginatedLineChart({
            title: `${t("ROYALTIES_BY_MONTH")}`,
            endpoint: ApiRoutes.getGlobalRoyaltiesByMonth,
            currency: true,
        });
    }

    static globalSalesByMonthChart() {
        return ChartTemplates.paginatedLineChart({
            title: `${t("SALES_BY_MONTH")}`,
            endpoint: ApiRoutes.getGlobalSalesByMonth,
            currency: true,
        });
    }

    static globalCumulativeTracksByMonthChart() {
        return ChartTemplates.paginatedLineChart({
            title: `${t("CUMULATIVE_TRACKS")}`,
            endpoint: ApiRoutes.getGlobalCumulativeTracksByMonth,
            cumulative: true,
        });
    }

    static globalCumulativeUsersByMonthChart() {
        return ChartTemplates.paginatedLineChart({
            title: `${t("CUMULATIVE_USERS")}`,
            endpoint: ApiRoutes.getGlobalCumulativeUsersByMonth,
            cumulative: true,
        });
    }

    static trackPlayCountByMonthChart(trackId: number) {
        return ChartTemplates.paginatedLineChart({
            title: `${t("CUMULATIVE_PLAYS")}`,
            endpoint: ApiRoutes.getPlayCountByMonthByTrack,
            params: {track_id: trackId},
            cumulative: true,
            timeType: "month",
        });
    }

    static trackLikesByMonthChart(trackId: number) {
        return ChartTemplates.paginatedLineChart({
            title: `${t("CUMULATIVE_LIKES")}`,
            endpoint: ApiRoutes.getLikesByMonthByTrack,
            params: {track_id: trackId},
            cumulative: true,
            timeType: "month",
        });
    }

    static trackRepostsByMonthChart(trackId: number) {
        return ChartTemplates.paginatedLineChart({
            title: `${t("CUMULATIVE_REPOSTS")}`,
            endpoint: ApiRoutes.getRepostsByMonthByTrack,
            params: {track_id: trackId},
            cumulative: true,
            timeType: "month",
        });
    }

    static trackSalesByMonthChart(trackId: number) {
        return ChartTemplates.paginatedLineChart({
            title: `${t("CUMULATIVE_BUYERS")}`,
            endpoint: ApiRoutes.getSalesByMonthByTrack,
            params: {track_id: trackId},
            cumulative: true,
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
        return ChartTemplates.barChart(labels, values, `${t("ROYALTIES")}`, `${t("ROYALTIES_BY_TRACK")}`, "royaltiesByTrackChart", undefined, true);
    }

    static playCountByTrackChart(trackNames: string[], playCounts: number[]) {
        if (trackNames.length === 0) {
            return ChartTemplates.noData(t("PLAYCOUNT_BY_TRACK"));
        }
        return ChartTemplates.barChart(trackNames, playCounts, `${t("PLAYS")}`, `${t("PLAYCOUNT_BY_TRACK")}`, "playCountByTrackChart");
    }

    static allStats() {
        const royaltyInfo = signal<RoyaltyInfo | null>(null);
        Api.getRoyaltyInfo().then(ri => royaltyInfo.value = ri);

        return create("div")
            .classes("flex", "fullWidth")
            .children(
                ...StatisticsWrapper.getStatistics(),
                compute(ri => ri
                    ? ChartTemplates.boxPlotChart(ri.personal.trackRoyaltyValues, `${t("TRACK_ROYALTY_SPREAD")}`, "personalTrackRoyaltySpreadChart", undefined, true)
                    : ChartTemplates.noData(`${t("TRACK_ROYALTY_SPREAD")}`), royaltyInfo),
                PayoutTemplates.dataExport(),
            ).build();
    }

    static globalStats() {
        const royaltyInfo = signal<RoyaltyInfo | null>(null);
        Api.getRoyaltyInfo().then(ri => royaltyInfo.value = ri);

        const statistics: Array<AnyElement | Signal<AnyElement>> = StatisticsWrapper.getGlobalStatistics();
        statistics.push(compute(ri => ri
            ? ChartTemplates.boxPlotChart(ri.global.trackRoyaltyValues, `${t("TRACK_ROYALTY_SPREAD")}`, "globalTrackRoyaltySpreadChart", undefined, true)
            : ChartTemplates.noData(`${t("TRACK_ROYALTY_SPREAD")}`), royaltyInfo));

        return vertical(
            horizontal(
                compute(ri => ri ? PayoutTemplates.globalRoyaltyInfo(ri) : nullElement(), royaltyInfo),
            ).classes("card"),
            create("div")
                .classes("flex", "fullWidth")
                .children(
                    ...statistics,
                ).build(),
        ).build();
    }
}
