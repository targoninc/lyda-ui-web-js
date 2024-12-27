import {StatisticTemplates} from "../Templates/StatisticTemplates.ts";
import {Api} from "../Api/Api.ts";
import {notify} from "./Ui.ts";
import {Num} from "./Helpers/Num.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {signal} from "../../fjsc/src/signals.ts";
import {getErrorMessage} from "./Util.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import { Statistic } from "../Models/Statistic.ts";

export class StatisticsWrapper {
    static async getStatistics() {
        return [
            await StatisticsWrapper.getPlayCountByMonth(),
            await StatisticsWrapper.getRoyaltiesByMonth(),
            await StatisticsWrapper.getRoyaltiesByTrack(),
            await StatisticsWrapper.getPlayCountByTracks(),
            await StatisticsWrapper.getLikesByTrack(),
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
}