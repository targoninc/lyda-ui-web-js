import { compute, create, nullElement, signal } from "@targoninc/jess";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { ChartTemplates } from "./generic/ChartTemplates.ts";
import { StatisticsWrapper } from "../Classes/StatisticsWrapper.ts";
import { PayoutTemplates } from "./money/PayoutTemplates.ts";
import { RoyaltyInfo } from "@targoninc/lyda-shared/src/Models/RoyaltyInfo.ts";
import { Api } from "../Api/Api.ts";
import { horizontal } from "./generic/GenericTemplates.ts";

export class StatisticTemplates {
    static playCountByMonthChart() {
        return ChartTemplates.paginatedBarChart({
            title: "Play count by month",
            endpoint: ApiRoutes.getPlayCountByMonth,
            timeType: "month"
        });
    }

    static royaltiesByMonthChart() {
        return ChartTemplates.paginatedBarChart({
            title: "Royalties by month",
            endpoint: ApiRoutes.getRoyaltiesByMonth,
            timeType: "month"
        });
    }

    static globalPlayCountByMonthChart() {
        return ChartTemplates.paginatedBarChart({
            title: "Play count by month",
            endpoint: ApiRoutes.getGlobalPlayCountByMonth,
            timeType: "month",
        });
    }

    static globalRoyaltiesByMonthChart() {
        return ChartTemplates.paginatedBarChart({
            title: "Royalties by month",
            endpoint: ApiRoutes.getGlobalRoyaltiesByMonth,
            timeType: "month",
        });
    }

    static likesByTrackChart(trackNames: string[], likeCounts: number[]) {
        if (trackNames.length === 0) {
            return ChartTemplates.noData("Likes by track");
        }
        return ChartTemplates.barChart(trackNames, likeCounts, "Likes", "Likes by track", "likesByTrackChart");
    }

    static royaltiesByTrackChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return ChartTemplates.noData("Royalties by track");
        }
        return ChartTemplates.barChart(labels, values, "Royalties", "Royalties by track", "royaltiesByTrackChart");
    }

    static playCountByTrackChart(trackNames: string[], playCounts: number[]) {
        if (trackNames.length === 0) {
            return ChartTemplates.noData("Play count by track");
        }
        return ChartTemplates.barChart(trackNames, playCounts, "Plays", "Play count by track", "playCountByTrackChart");
    }

    static async allStats() {
        const stats = await StatisticsWrapper.getStatistics();

        return create("div")
            .classes("flex", "fullWidth")
            .children(
                ...stats
            ).build();
    }

    static async globalStats() {
        const stats = await StatisticsWrapper.getGlobalStatistics();
        const royaltyInfo = signal<RoyaltyInfo | null>(null);
        Api.getRoyaltyInfo().then(ri => royaltyInfo.value = ri);

        return create("div")
            .classes("flex", "fullWidth")
            .children(
                horizontal(
                    compute(ri => ri ? PayoutTemplates.globalRoyaltyInfo(ri) : nullElement(), royaltyInfo),
                ).classes("card"),
                ...stats,
            ).build();
    }
}
