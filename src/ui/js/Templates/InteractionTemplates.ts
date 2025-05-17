import {compute, Signal, signal} from "@targoninc/jess";
import {GenericTemplates} from "./generic/GenericTemplates.ts";
import {Api} from "../Api/Api.ts";
import {notify} from "../Classes/Ui.ts";
import {getErrorMessage} from "../Classes/Util.ts";
import {InteractionMetadata} from "@targoninc/lyda-shared/dist/Models/InteractionMetadata";
import {InteractionConfig} from "@targoninc/lyda-shared/dist/Models/InteractionConfig";
import {NotificationType} from "../Enums/NotificationType.ts";

export class InteractionTemplates {
    static interactionButton<T>(metadata: InteractionMetadata<T>, config: InteractionConfig, id: number) {
        const interacted$ = signal(metadata.interacted ?? false);
        const icon$ = compute(i => i ? config.icons.interacted : config.icons.default, interacted$);
        const class$ = compute((i): string => i ? "positive" : "negative", interacted$);

        return GenericTemplates.roundIconButton({icon: icon$}, () => interact(config, id, interacted$), config.type, [class$]);
    }
}

async function interact(config: InteractionConfig, id: number, interacted$: Signal<boolean>) {
    if (!config.toggleable) {
        return;
    }

    const res = await Api.postAsync(`/interact/${config.entityType}/${config.type}`, {id});
    if (res.code === 200) {
        interacted$.value = !interacted$.value;
    } else {
        notify(getErrorMessage(res), NotificationType.error);
    }
}