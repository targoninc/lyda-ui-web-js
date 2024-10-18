import {StatisticTemplates} from "../Templates/StatisticTemplates.mjs";
import {signal} from "https://fjs.targoninc.com/f.js";
import {Api} from "./Api.ts";
import {Ui} from "./Ui.ts";
import {Num} from "./Helpers/Num.mjs";

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

    static async getRoyaltiesByMonth() {
        const chartObservable = signal(StatisticTemplates.royaltiesByMonthChart([], []));
        Api.getAsync(Api.endpoints.statistics.royaltiesByMonth).then((res) => {
            if (res.code !== 200) {
                Ui.notify(res.data, "error");
                return;
            }
            res.data.reverse();
            const labels = res.data.map((item) => item.month);
            const values = Num.shortenInArray(res.data.map((item) => item.amount));
            chartObservable.value = StatisticTemplates.royaltiesByMonthChart(labels, values);
        });
        return chartObservable;
    }

    static async getRoyaltiesByTrack() {
        const chartObservable = signal(StatisticTemplates.royaltiesByTrackChart([], []));
        Api.getAsync(Api.endpoints.statistics.royaltiesByTrack).then((res) => {
            if (res.code !== 200) {
                Ui.notify(res.data, "error");
                return;
            }
            const labels = res.data.map((item) => item.title);
            const values = Num.shortenInArray(res.data.map((item) => item.amount));
            chartObservable.value = StatisticTemplates.royaltiesByTrackChart(labels, values);
        });
        return chartObservable;
    }

    static async getPlayCountByTracks() {
        const chartObservable = signal(StatisticTemplates.playCountByTrackChart([], []));
        Api.getAsync(Api.endpoints.statistics.playCountByTrack).then((res) => {
            if (res.code !== 200) {
                Ui.notify(res.data, "error");
                return;
            }
            const labels = res.data.map((item) => item.title);
            const values = Num.shortenInArray(res.data.map((item) => item.plays));
            chartObservable.value = StatisticTemplates.playCountByTrackChart(labels, values);
        });
        return chartObservable;
    }

    static async getPlayCountByMonth() {
        const chartObservable = signal(StatisticTemplates.playCountByMonthChart([], []));
        Api.getAsync(Api.endpoints.statistics.playCountByMonth).then((res) => {
            if (res.code !== 200) {
                Ui.notify(res.data, "error");
                return;
            }
            res.data.reverse();
            const labels = res.data.map((item) => item.month);
            const values = Num.shortenInArray(res.data.map((item) => item.plays));
            chartObservable.value = StatisticTemplates.playCountByMonthChart(labels, values);
        });
        return chartObservable;
    }

    static async getLikesByTrack() {
        const chartObservable = signal(StatisticTemplates.likesByTrackChart([], []));
        Api.getAsync(Api.endpoints.statistics.likesByTrack).then((res) => {
            if (res.code !== 200) {
                Ui.notify(res.data, "error");
                return;
            }
            const labels = res.data.map((item) => item.title);
            const values = Num.shortenInArray(res.data.map((item) => item.likes));
            chartObservable.value = StatisticTemplates.likesByTrackChart(labels, values);
        });
        return chartObservable;
    }
}