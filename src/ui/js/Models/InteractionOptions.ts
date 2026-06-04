import { InteractionType } from "@targoninc/lyda-shared/src/Enums/InteractionType.ts";
import {Signal} from "@targoninc/jess";

export interface InteractionOptions {
    showCount?: boolean;
    overrideActions?: InteractionType[];
    disabled?: Signal<boolean>;
}