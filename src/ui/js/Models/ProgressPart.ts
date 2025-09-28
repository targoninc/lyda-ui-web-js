import { ProgressState } from "@targoninc/lyda-shared/src/Enums/ProgressState";
import { StringOrSignal } from "@targoninc/jess";

export interface ProgressPart {
    icon: string;
    text: StringOrSignal;
    state: ProgressState;
    title?: StringOrSignal;
    retryFunction?: Function;
    progress?: number;
}