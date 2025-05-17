import {InteractionType} from "../EnumsShared/InteractionType.ts";
import {EntityType} from "../EnumsShared/EntityType.ts";

export interface InteractionConfig {
    type: InteractionType;
    entityType: EntityType;
    toggleable?: boolean;
    icons: {
        default: string;
        interacted: string;
    }
    requiredOptions?: string[];
    optionalOptions?: string[];
}