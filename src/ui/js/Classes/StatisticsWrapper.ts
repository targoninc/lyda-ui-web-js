import { StatisticTemplates } from "../Templates/StatisticTemplates.ts";
import { Num } from "./Helpers/Num.ts";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { create, signal, signalMap } from "@targoninc/jess";
import { Api } from "../Api/Api.ts";

export class StatisticsWrapper {
    static getStatistics() {
        return [
            StatisticTemplates.playCountByMonthChart(),
            StatisticTemplates.royaltiesByMonthChart(),
            StatisticsWrapper.getRoyaltiesByTrack(),
            StatisticsWrapper.getPlayCountByTracks(),
            StatisticsWrapper.getLikesByTrack(),
        ];
    }

    static getGlobalStatistics() {
        return [
            StatisticTemplates.globalRoyaltiesByMonthChart(),
            StatisticTemplates.globalPlayCountByMonthChart(),
        ];
    }

    static getSingleStat(template: Function, endpoint: string, reverse: boolean = false) {
        const chart = signal(template([], []));
        Api.getStatistic(endpoint).then((stat) => {
            stat ??= [];
            if (reverse) {
                stat.reverse();
            }
            const labels = stat.map((item: any) => item.label);
            const values = Num.shortenInArray(stat.map((item: any) => item.value));
            chart.value = template(labels, values);
        });
        return chart;
    }

    static getMultipleStats(template: Function, endpoint: string, reverse: boolean = false) {
        const charts = signal<any[]>([]);

        Api.getTypedStatistic(endpoint).then((data) => {
            data ??= [];
            if (reverse) {
                data.reverse();
            }

            const components = [];
            for (const stat of data) {
                const labels = stat.stats.map((item) => item.label);
                const values = Num.shortenInArray(stat.stats.map((item) => item.value));
                components.push(template(labels, values, stat.type));
            }
            charts.value = components;
        });

        return signalMap(charts, create("div").classes("flex", "fullWidth"), (chart: any) => chart);
    }

    static getRoyaltiesByTrack() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.royaltiesByTrackChart, ApiRoutes.getRoyaltiesByTrack);
    }

    static getPlayCountByTracks() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.playCountByTrackChart, ApiRoutes.getPlayCountByTrack);
    }

    static getLikesByTrack() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.likesByTrackChart, ApiRoutes.getLikesByTrack, true);
    }
}