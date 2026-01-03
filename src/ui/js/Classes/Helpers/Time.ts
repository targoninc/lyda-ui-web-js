import { signal } from "@targoninc/jess";
import { t } from "../../../locales";

export class Time {
    static localDate(time: number|string|Date) {
        return new Date(time).toDateString();
    }

    static adjust(time: number|string|Date): Date {
        time = new Date(time);
        time.setMinutes(time.getMinutes() - time.getTimezoneOffset());
        return time;
    }

    static ago(time: number|string|Date, useShort = false): string {
        time = Time.adjust(time);
        switch (typeof time) {
        case "number":
            break;
        case "string":
            time = +new Date(time);
            break;
        case "object":
            if (time.constructor === Date) time = time.getTime();
            break;
        default:
            time = +new Date();
        }
        const time_formats = [
            [60, `${t("SECONDS")}`, 1],
            [120, `${t("MINUTE_AGO")}`, `${t("MINUTE_UNTIL")}`],
            [3600, `${t("MINUTES")}`, 60],
            [7200, `${t("HOUR_AGO")}`, `${t("HOUR_UNTIL")}`],
            [86400, `${t("HOURS")}`, 3600],
            [172800, `${t("YESTERDAY")}`, `${t("TOMORROW")}`],
            [604800, `${t("DAYS")}`, 86400],
            [1209600, `${t("LAST_WEEK")}`, `${t("NEXT_WEEK")}`],
            [2419200, `${t("WEEKS")}`, 604800],
            [4838400, `${t("LAST_MONTH")}`, `${t("NEXT_MONTH")}`],
            [29030400, `${t("MONTHS")}`, 2419200],
            [58060800, `${t("LAST_YEAR")}`, `${t("NEXT_YEAR")}`],
            [2903040000, `${t("YEARS")}`, 29030400],
            [5806080000, `${t("LAST_CENTURY")}`, `${t("NEXT_CENTURY")}`],
            [58060800000, `${t("CENTURIES")}`, 2903040000],
        ];
        const time_formats_short = [
            [60, "s", 1],
            [120, "1m"],
            [3600, "m", 60],
            [7200, "1h"],
            [86400, "h", 3600],
            [172800, "1d"],
            [604800, "d", 86400],
            [1209600, "1w"],
            [2419200, "w", 604800],
            [4838400, "1mo"],
            [29030400, "mo", 2419200],
            [58060800, "1y"],
            [2903040000, "y", 29030400],
            [5806080000, "1c"],
            [58060800000, "c", 2903040000],
        ];
        let seconds = (+new Date() - <number>time) / 1000,
            token = `${t("AGO")}`,
            isFuture = false;

        if (seconds === 0) {
            return t("JUST_NOW").toString();
        } else if (seconds < 0) {
            seconds = Math.abs(seconds);
            token = `${t("UNTIL")}`;
            isFuture = true;
        }

        let i = 0, format;
        const used_formats = useShort ? time_formats_short : time_formats;

        while ((format = used_formats[i++])) {
            if (seconds < (format[0] as number)) {
                if (!format[2]) {
                    return t("TIME_FORMATTED_SHORT", format[1], token).toString();
                } else {
                    if (typeof format[2] == "string") {
                        return format[isFuture ? 2 : 1] as string;
                    }

                    const num = Math.floor(seconds / format[2]);
                    return t("TIME_FORMATTED", num, format[1], token).toString();
                }
            }
        }

        return time.toString();
    }

    static #shouldUpdateInSeconds(time: string) {
        return time.includes(`${t("SECONDS")}`) || time === `${t("JUST_NOW")}`;
    }

    static agoUpdating(time: number|string|Date, useShort = false) {
        const state = signal(Time.ago(time, useShort));
        const update = () => {
            state.value = Time.ago(time, useShort);
            const updateInterval = Time.#shouldUpdateInSeconds(state.value) ? 1000 : 60000;
            if (state.value.includes("hours")) {
                return;
            }
            setTimeout(update, updateInterval);
        };
        update();

        return state;
    }

    static format(timeInSeconds: number): string {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds - minutes * 60);
        return minutes + ":" + seconds.toString().padStart(2, "0");
    }

    static toTimeString(time: number|string|Date) {
        return new Date(time).toTimeString().split(" ")[0];
    }
}