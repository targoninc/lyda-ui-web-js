import {AnyNode, compute, create, HtmlPropertyValue, nullElement, Signal, signal, when} from "@targoninc/jess";
import {GenericTemplates} from "./generic/GenericTemplates.ts";
import {Api} from "../Api/Api.ts";
import {notify} from "../Classes/Ui.ts";
import {getErrorMessage} from "../Classes/Util.ts";
import {InteractionMetadata} from "@targoninc/lyda-shared/src/Models/InteractionMetadata";
import {InteractionConfig} from "@targoninc/lyda-shared/src/Models/InteractionConfig";
import {NotificationType} from "../Enums/NotificationType.ts";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {InteractionType} from "@targoninc/lyda-shared/src/Enums/InteractionType";
import {Icons} from "../Enums/Icons.ts";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import {currentUser} from "../state.ts";
import { ApiRoutes } from "../Api/ApiRoutes.ts";

const interactionConfigs: Record<InteractionType, InteractionConfig> = {
    [InteractionType.like]: {
        icons: {
            default: Icons.LIKE_OUTLINE,
            interacted: Icons.LIKE
        },
        toggleable: true,
    },
    [InteractionType.repost]: {
        icons: {
            default: Icons.REPOST,
            interacted: Icons.REPOST
        },
        toggleable: true,
    },
    [InteractionType.comment]: {
        icons: {
            default: "comment",
            interacted: "comment"
        },
        toggleable: false,
    },
}

export class InteractionTemplates {
    private static interactionButton<T>(entityType: EntityType, interactionType: InteractionType, metadata: InteractionMetadata<T>, config: InteractionConfig, id: number) {
        const count$ = signal(metadata.count ?? 0);
        const interacted$ = signal(metadata.interacted ?? false);
        //const list$ = signal(metadata.list); TODO: Not yet used...figure out if we want to display the list of interactions right where the count is or elsewhere (probably the second option)

        const icon$ = compute(i => i ? config.icons.interacted : config.icons.default, interacted$);
        const stateClass$ = compute((s: boolean): string => s ? "active" : "_", interacted$);
        const disabledClass$ = compute((u): string => !u ? "disabled" : "_", currentUser);
        const inertClass = config.toggleable ? "_" : "inert";

        return create("div")
            .classes("flex", "align-children", disabledClass$)
            .children(
                GenericTemplates.roundIconButton({
                    icon: icon$,
                    isUrl: icon$.value.includes("http")
                }, () => toggleInteraction(entityType, interactionType, config, id, interacted$, count$), interactionType,
                    ["positive", stateClass$, "stats-indicator", inertClass]),
                when(metadata.count !== undefined && metadata.count !== null, create("span")
                    .classes("interaction-count")
                    .text(count$ as HtmlPropertyValue)
                    .build()),
            ).build();
    }

    static interactions<T>(entityType: EntityType, entity: T) {
        let elements: AnyNode[];
        switch (entityType) {
            case EntityType.track:
                elements = InteractionTemplates.trackInteractions(entity as Track);
                break;
            case EntityType.album:
                elements = InteractionTemplates.albumInteractions(entity as Album);
                break;
            case EntityType.playlist:
                elements = InteractionTemplates.playlistInteractions(entity as Playlist);
                break;
            default:
                elements = [nullElement()];
        }
        return create("div")
            .classes("interactions-container", "flex")
            .children(...elements)
            .build();
    }

    private static interactionList<T extends {
        id: number
    }>(interactions: InteractionType[], entity: T, entityType: EntityType) {
        const elements = [];
        for (const interaction of interactions) {
            const config = interactionConfigs[interaction];
            elements.push(InteractionTemplates.interactionButton(entityType, interaction, entity[interaction + "s" as keyof T] ?? {} as InteractionMetadata<any>, config, entity.id));
        }

        return elements;
    }

    private static trackInteractions(entity: Track, overrideActions?: InteractionType[]) {
        const interactions = [InteractionType.like, InteractionType.repost, InteractionType.comment];
        return this.interactionList(overrideActions ?? interactions, entity, EntityType.track);
    }

    private static albumInteractions(entity: Album) {
        const interactions = [InteractionType.like];
        return this.interactionList(interactions, entity, EntityType.album);
    }

    private static playlistInteractions(entity: Playlist) {
        const interactions = [InteractionType.like];
        return this.interactionList(interactions, entity, EntityType.playlist);
    }
}

async function toggleInteraction(entityType: EntityType, interactionType: InteractionType, config: InteractionConfig, id: number, interacted$: Signal<boolean>, count$: Signal<number>) {
    if (!config.toggleable) {
        return;
    }

    const res = await Api.postAsync(ApiRoutes.toggleInteraction, {
        entityType,
        interactionType,
        id,
        toggle: !interacted$.value
    });
    if (res.code === 200) {
        interacted$.value = !interacted$.value;
        if (interacted$.value) {
            count$.value = count$.value + 1;
        } else {
            count$.value = count$.value - 1;
        }
    } else {
        notify(getErrorMessage(res), NotificationType.error);
    }
}