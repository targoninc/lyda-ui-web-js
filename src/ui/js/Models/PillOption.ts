import { StringOrSignal } from "@targoninc/jess";

export interface PillOption {
    text: StringOrSignal;
    value?: any;
    icon?: string;
    onclick?: Function;
}
