import {InputType} from "@targoninc/jess";

export interface Filter {
    key: string;
    name: string;
    type: InputType;
    default?: any;
}