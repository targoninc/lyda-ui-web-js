import {ProgressState} from "../Enums/ProgressState.ts";
import {Signal, StringOrSignal} from "@targoninc/jess";

export interface ProgressPart {
    id: string;
    icon: string;
    text: Signal<string>;
    state: Signal<ProgressState>;
    title?: StringOrSignal;
    retryFunction?: Function;
    progress?: Signal<number>;
}