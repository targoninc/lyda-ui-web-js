import { AnyNode, compute, create, HtmlPropertyValue, nullElement, Signal, signal, when } from "@targoninc/jess";
import { GenericTemplates } from "./generic/GenericTemplates.ts";
import { InteractionMetadata } from "@targoninc/lyda-shared/src/Models/InteractionMetadata";
import { InteractionConfig } from "@targoninc/lyda-shared/src/Models/InteractionConfig";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { InteractionType } from "@targoninc/lyda-shared/src/Enums/InteractionType";
import { Icons } from "../Enums/Icons.ts";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { Playlist } from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import { currentUser } from "../state.ts";
import { Visibility } from "@targoninc/lyda-shared/dist/Enums/Visibility";
import { Api } from "../Api/Api.ts";
import { InteractionOptions } from "../Models/InteractionOptions.ts";

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
    private static interactionButton<T extends { id: number, visibility: Visibility }>(entityType: EntityType,
        interactionType: InteractionType, metadata: InteractionMetadata<T>, config: InteractionConfig, entity: T, showCount = true) {
        const count$ = signal(metadata.count ?? 0);
        const interacted$ = signal(metadata.interacted ?? false);
        //const list$ = signal(metadata.list); TODO: Load the list dynamically and display it in a popup

        const icon$ = compute(i => i ? config.icons.interacted : config.icons.default, interacted$);
        const stateClass$ = compute((s: boolean): string => s ? "active" : "_", interacted$);
        const inertClass = config.toggleable ? "_" : "inert";
        const disabledClass$ = compute((u): string => (!u || (entity.visibility === "private" && inertClass !== "inert")) ? "disabled" : "_", currentUser);

        return create("div")
            .classes("flex", "align-children", disabledClass$)
            .children(
                GenericTemplates.roundIconButton({
                    icon: icon$,
                    isUrl: icon$.value.includes("http")
                }, () => toggleInteraction(entityType, interactionType, config, entity.id, interacted$, count$), interactionType,
                    ["positive", stateClass$, "stats-indicator", inertClass]),
                when(metadata.count !== undefined && metadata.count !== null && showCount, create("span")
                    .classes("interaction-count")
                    .text(count$ as HtmlPropertyValue)
                    .build()),
            ).build();
    }

    static interactions<T>(entityType: EntityType, entity: T, options?: InteractionOptions) {
        let elements: AnyNode[];
        switch (entityType) {
            case EntityType.track:
                elements = InteractionTemplates.trackInteractions(entity as Track, options?.overrideActions, options?.showCount);
                break;
            case EntityType.album:
                elements = InteractionTemplates.albumInteractions(entity as Album, options?.showCount);
                break;
            case EntityType.playlist:
                elements = InteractionTemplates.playlistInteractions(entity as Playlist, options?.showCount);
                break;
            default:
                elements = [nullElement()];
        }
        return create("div")
            .classes("interactions-container", "flex", "align-children")
            .children(...elements).build();
    }

    private static interactionList<T extends {
        id: number
    }>(interactions: InteractionType[], entity: T, entityType: EntityType, showCount = true) {
        const elements = [];
        for (const interaction of interactions) {
            const config = interactionConfigs[interaction];
            elements.push(InteractionTemplates.interactionButton(entityType, interaction, entity[interaction + "s" as keyof T] ?? {} as InteractionMetadata<any>, config, entity, showCount));
        }

        return elements;
    }

    private static trackInteractions(entity: Track, overrideActions?: InteractionType[], showCount = true) {
        const interactions = [InteractionType.like, InteractionType.repost, InteractionType.comment];
        return this.interactionList(overrideActions ?? interactions, entity, EntityType.track, showCount);
    }

    private static albumInteractions(entity: Album, showCount = true) {
        const interactions = [InteractionType.like];
        return this.interactionList(interactions, entity, EntityType.album, showCount);
    }

    private static playlistInteractions(entity: Playlist, showCount = true) {
        const interactions = [InteractionType.like];
        return this.interactionList(interactions, entity, EntityType.playlist, showCount);
    }
}

async function toggleInteraction(entityType: EntityType, interactionType: InteractionType, config: InteractionConfig, id: number, interacted$: Signal<boolean>, count$: Signal<number>) {
    if (!config.toggleable) {
        return;
    }

    await Api.toggleInteraction(entityType, interactionType, id, interacted$);
    interacted$.value = !interacted$.value;
    if (interacted$.value) {
        count$.value = count$.value + 1;
    } else {
        count$.value = count$.value - 1;
    }
}