import {StatisticTemplates} from "../Templates/StatisticTemplates.ts";
import {Api} from "../Api/Api.ts";
import {notify} from "./Ui.ts";
import {Num} from "./Helpers/Num.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {compute, signal} from "../../fjsc/src/signals.ts";
import {getErrorMessage} from "./Util.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import { Statistic } from "../Models/Statistic.ts";
import {Permission} from "../Models/DbModels/lyda/Permission.ts";
import {Permissions} from "../Enums/Permissions.ts";
import {create, signalMap} from "../../fjsc/src/f2.ts";
import {TypedStatistic} from "../Models/TypedStatistic.ts";
import {StatisticsTemplates} from "../Templates/StatisticsTemplates.ts";
import {ActivityTableName} from "../Enums/ActivityTableName.ts";
import {TimeResolution} from "../Enums/TimeResolution.ts";

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
        Api.getAsync<Statistic[]>(endpoint).then((res) => {
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

        Api.getAsync<TypedStatistic[]>(endpoint).then((res) => {
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

        return create("div")
            .children(
                signalMap(charts, create("div").classes("flex"), (chart: any) => chart),
            ).build();
    }

    static async getRoyaltiesByMonth() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.royaltiesByMonthChart, ApiRoutes.getRoyaltiesByMonth, true);
    }

    static async getRoyaltiesByTrack() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.royaltiesByTrackChart, ApiRoutes.getRoyaltiesByTrack);
    }

    static async getPlayCountByTracks() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.playCountByTrackChart, ApiRoutes.getPlayCountByTrack);
    }

    static async getPlayCountByMonth() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.playCountByMonthChart, ApiRoutes.getPlayCountByMonth, true);
    }

    static async getLikesByTrack() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.likesByTrackChart, ApiRoutes.getLikesByTrack, true);
    }

    static getActivityByTime() {
        const types = [ActivityTableName.tracks];
        const params = new URLSearchParams();
        params.append("types", types.join(","));
        params.append("resolution", TimeResolution.hour);
        return StatisticsWrapper.getMultipleStats(StatisticTemplates.activityByTimeChart, ApiRoutes.getActivityByTime + `?` + params.toString());
    }
}