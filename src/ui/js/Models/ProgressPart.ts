import {ProgressState} from "../Enums/ProgressState.ts";

export interface ProgressPart {
    id: string;
    icon: string;
    text: string;
    state: ProgressState;
    title?: string;
    retryFunction?: Function;
}