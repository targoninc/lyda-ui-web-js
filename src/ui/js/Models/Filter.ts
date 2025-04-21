import {InputType} from "../../fjsc/src/Types.ts";

export interface Filter {
    key: string;
    name: string;
    type: InputType;
    default?: any;
}