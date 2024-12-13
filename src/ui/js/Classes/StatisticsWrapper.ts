import {StatisticTemplates} from "../Templates/StatisticTemplates.ts";
import {Api} from "../Api/Api.ts";
import {notify} from "./Ui.ts";
import {Num} from "./Helpers/Num.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {signal} from "../../fjsc/src/signals.ts";

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

    static async getSingleStat(template: Function, endpoint: string, keyProperty: string, valueProperty: string, reverse: boolean = false) {
        const chart = signal(template([], []));
        Api.getAsync(endpoint).then((res) => {
            if (res.code !== 200) {
                notify(res.data, "error");
                return;
            }
            if (reverse) {
                res.data.reverse();
            }
            const labels = res.data.map((item: any) => item[keyProperty]);
            const values = Num.shortenInArray(res.data.map((item: any) => item[valueProperty]));
            chart.value = template(labels, values);
        });
        return chart;
    }

    static async getRoyaltiesByMonth() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.royaltiesByMonthChart, ApiRoutes.getRoyaltiesByMonth, "month", "amount", true);
    }

    static async getRoyaltiesByTrack() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.royaltiesByTrackChart, ApiRoutes.getRoyaltiesByTrack, "title", "amount");
    }

    static async getPlayCountByTracks() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.playCountByTrackChart, ApiRoutes.getPlayCountByTrack, "title", "plays");
    }

    static async getPlayCountByMonth() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.playCountByMonthChart, ApiRoutes.getPlayCountByMonth, "month", "plays", true);
    }

    static async getLikesByTrack() {
        return StatisticsWrapper.getSingleStat(StatisticTemplates.likesByTrackChart, ApiRoutes.getLikesByTrack, "title", "likes", true);
    }
}