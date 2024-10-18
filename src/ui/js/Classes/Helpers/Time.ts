import {signal} from "../../../fjsc/f2.ts";

export class Time {
    static localDate(time: number|string|Date) {
        return new Date(time).toDateString();
    }

    static adjust(time: number|string|Date): Date {
        time = new Date(time);
        time.setMinutes(time.getMinutes() - time.getTimezoneOffset());
        return time;
    }

    static ago(time: number|string|Date): string {
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
            [60, "seconds", 1], // 60
            [120, "1 minute ago", "1 minute from now"], // 60*2
            [3600, "minutes", 60], // 60*60, 60
            [7200, "1 hour ago", "1 hour from now"], // 60*60*2
            [86400, "hours", 3600], // 60*60*24, 60*60
            [172800, "Yesterday", "Tomorrow"], // 60*60*24*2
            [604800, "days", 86400], // 60*60*24*7, 60*60*24
            [1209600, "Last week", "Next week"], // 60*60*24*7*4*2
            [2419200, "weeks", 604800], // 60*60*24*7*4, 60*60*24*7
            [4838400, "Last month", "Next month"], // 60*60*24*7*4*2
            [29030400, "months", 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
            [58060800, "Last year", "Next year"], // 60*60*24*7*4*12*2
            [2903040000, "years", 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
            [5806080000, "Last century", "Next century"], // 60*60*24*7*4*12*100*2
            [58060800000, "centuries", 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
        ];
        let seconds = (+new Date() - <number>time) / 1000,
            token = "ago",
            list_choice = 1;

        if (seconds === 0) {
            return "Just now";
        }
        if (seconds < 0) {
            seconds = Math.abs(seconds);
            token = "from now";
            list_choice = 2;
        }
        let i = 0, format;
        while ((format = time_formats[i++])) {
            if (seconds < (format[0] as number)) {
                if (typeof format[2] == "string")
                    return format[list_choice] as string;
                else
                    return Math.floor(seconds / format[2]) + " " + format[1] + " " + token;
            }
        }
        return time.toString();
    }

    static #shouldUpdateInSeconds(time: string) {
        return time.includes("seconds") || time === "Just now";
    }

    static agoUpdating(time: number|string|Date) {
        const state = signal(Time.ago(time));
        const updateIn = (time: string|number|Date) => {
            state.value = Time.ago(time);
            const updateInterval = Time.#shouldUpdateInSeconds(state.value) ? 1000 : 60000;
            if (state.value.includes("hours")) {
                return;
            }
            setTimeout(() => updateIn(time), updateInterval);
        };
        updateIn(1000);

        return state;
    }

    static format(time: number): string {
        let minutes = Math.floor(time / 60);
        let seconds = Math.floor(time - minutes * 60);
        return minutes + ":" + seconds.toString().padStart(2, "0");
    }
}