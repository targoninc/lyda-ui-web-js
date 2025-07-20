import { InteractionType } from "@targoninc/lyda-shared/src/Enums/InteractionType.ts";

export interface InteractionOptions {
    showCount?: boolean;
    overrideActions?: InteractionType[];
}