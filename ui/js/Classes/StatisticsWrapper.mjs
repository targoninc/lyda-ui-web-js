import {StatisticTemplates} from "../Templates/StatisticTemplates.mjs";
import {FjsObservable} from "https://fjs.targoninc.com/f.js";
import {Util} from "./Util.mjs";
import {Api} from "./Api.mjs";
import {Ui} from "./Ui.mjs";
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
        const chartObservable = new FjsObservable(StatisticTemplates.royaltiesByMonthChart([], []));
        Api.getAsync(Api.endpoints.statistics.royaltiesByMonth, {}, Util.getAuthorizationHeaders()).then((res) => {
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
        const chartObservable = new FjsObservable(StatisticTemplates.royaltiesByTrackChart([], []));
        Api.getAsync(Api.endpoints.statistics.royaltiesByTrack, {}, Util.getAuthorizationHeaders()).then((res) => {
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
        const chartObservable = new FjsObservable(StatisticTemplates.playCountByTrackChart([], []));
        Api.getAsync(Api.endpoints.statistics.playCountByTrack, {}, Util.getAuthorizationHeaders()).then((res) => {
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
        const chartObservable = new FjsObservable(StatisticTemplates.playCountByMonthChart([], []));
        Api.getAsync(Api.endpoints.statistics.playCountByMonth, {}, Util.getAuthorizationHeaders()).then((res) => {
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
        const chartObservable = new FjsObservable(StatisticTemplates.likesByTrackChart([], []));
        Api.getAsync(Api.endpoints.statistics.likesByTrack, {}, Util.getAuthorizationHeaders()).then((res) => {
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