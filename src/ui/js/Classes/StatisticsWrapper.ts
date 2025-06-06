import {StatisticTemplates} from "../Templates/StatisticTemplates.ts";
import {HttpClient} from "../Api/HttpClient.ts";
import {notify} from "./Ui.ts";
import {Num} from "./Helpers/Num.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {create, signalMap, signal} from "@targoninc/jess";
import {getErrorMessage} from "./Util.ts";
import {Permissions} from "@targoninc/lyda-shared/src/Enums/Permissions";
import {Permission} from "@targoninc/lyda-shared/src/Models/db/lyda/Permission";
import {Statistic} from "@targoninc/lyda-shared/src/Models/Statistic";
import {NotificationType} from "../Enums/NotificationType.ts";
import {TypedStatistic} from "@targoninc/lyda-shared/src/Models/TypedStatistic";
import {TimeResolution} from "@targoninc/lyda-shared/src/Enums/TimeResolution";

export class StatisticsWrapper {
    static async getStatistics(permissions: Permission[]) {
        let additionalStats = [];
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
        HttpClient.getAsync<Statistic[]>(endpoint).then((res) => {
            if (res.code !== 200) {
                notify(getErrorMessage(res), NotificationType.error);
                return;
            }
            if (reverse) {
                res.data.reverse();
            }
            const labels = res.data.map((item: any) => item.label);
            const values = Num.shortenInArray(res.data.map((item: any) => item.value));
            chart.value = template(labels, values);
        });
        return chart;
    }

    static getMultipleStats(template: Function, endpoint: string, reverse: boolean = false) {
        const charts = signal<any[]>([]);

        HttpClient.getAsync<TypedStatistic[]>(endpoint).then((res) => {
            if (res.code !== 200) {
                notify(getErrorMessage(res), NotificationType.error);
                return;
            }
            const data = res.data as TypedStatistic[];
            if (reverse) {
                data.reverse();
            }

            let components = [];
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