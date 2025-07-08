import {StatisticTemplates} from "../Templates/StatisticTemplates.ts";
import {Num} from "./Helpers/Num.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {create, signalMap, signal} from "@targoninc/jess";
import {Permissions} from "@targoninc/lyda-shared/src/Enums/Permissions";
import {Permission} from "@targoninc/lyda-shared/src/Models/db/lyda/Permission";
import {TimeResolution} from "@targoninc/lyda-shared/src/Enums/TimeResolution";
import { Api } from "../Api/Api.ts";

export class StatisticsWrapper {
    static async getStatistics(permissions: Permission[]) {
        const additionalStats = [];
        if (permissions.some(p => p.name === Permissions.canViewLogs)) {
            additionalStats.push(StatisticsWrapper.getActivityByTime());
        }

        return [
            await StatisticsWrapper.getPlayCountByMonth(),
            await StatisticsWrapper.getRoyaltiesByMonth(),
            await StatisticsWrapper.getRoyaltiesByTrack(),
            await StatisticsWrapper.getPlayCountByTracks(),
            await StatisticsWrapper.getLikesByTrack(),
            ...additionalStats,
        ];
    }

    static async getSingleStat(template: Function, endpoint: string, reverse: boolean = false) {
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

    static async getRoyaltiesByMonth() {
        return StatisticTemplates.royaltiesByMonthChart();
    }

    static async getRoyaltiesByTrack() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.royaltiesByTrackChart, ApiRoutes.getRoyaltiesByTrack);
    }

    static async getPlayCountByTracks() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.playCountByTrackChart, ApiRoutes.getPlayCountByTrack);
    }

    static async getPlayCountByMonth() {
        return StatisticTemplates.playCountByMonthChart();
    }

    static async getLikesByTrack() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.likesByTrackChart, ApiRoutes.getLikesByTrack, true);
    }

    static getActivityByTime() {
        const types = ["tracks"];
        const params = new URLSearchParams();
        params.append("types", types.join(","));
        params.append("resolution", TimeResolution.hour);
        return StatisticsWrapper.getMultipleStats(StatisticTemplates.activityByTimeChart, ApiRoutes.getActivityByTime + `?` + params.toString());
    }
}