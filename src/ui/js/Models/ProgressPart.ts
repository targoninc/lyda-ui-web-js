import {ProgressState} from "../Enums/ProgressState.ts";
import {Signal} from "../../fjsc/src/signals.ts";
import {StringOrSignal} from "../../fjsc/src/f2.ts";

export interface ProgressPart {
    id: string;
    icon: string;
    text: Signal<string>;
    state: Signal<ProgressState>;
    title?: StringOrSignal;
    retryFunction?: Function;
    progress?: Signal<number>;
}