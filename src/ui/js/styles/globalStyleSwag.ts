import {SettableCss} from "../../fjsc/src/f2.ts";
import {signal} from "../../fjsc/src/signals.ts";

const color2 = signal("var(--color-2)");
let tracker = 0;

setInterval(() => {
    if (tracker === 0) {
        color2.value = "var(--green)";
    } else {
        color2.value = "var(--color-2)";
    }
    tracker = 1 - tracker;
}, 100);

export const globalStyles: Record<string, Partial<SettableCss>> = {
    foo: {
        color: color2,
    },
};
