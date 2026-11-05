import {AnyNode, compute, create, HtmlPropertyValue, nullElement, Signal, when} from "@targoninc/jess";
import {GenericTemplates} from "./generic/GenericTemplates.ts";
import {InteractionMetadata} from "@targoninc/lyda-shared/src/Models/InteractionMetadata";
import {InteractionConfig} from "@targoninc/lyda-shared/src/Models/InteractionConfig";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {InteractionType} from "@targoninc/lyda-shared/src/Enums/InteractionType";
import {Icons} from "../Enums/Icons.ts";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import {Comment} from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import {currentUser} from "../state.ts";
import {Visibility} from "@targoninc/lyda-shared/src/Enums/Visibility";
import {Api} from "../Api/Api.ts";
import {InteractionOptions} from "../Models/InteractionOptions.ts";
import {InteractionStateManager} from "../Classes/InteractionStateManager.ts";
import {InteractionPeoplePopover} from "../Classes/InteractionPeoplePopover.ts";
import {getTrackSecretCode} from "../Classes/Helpers/TrackSecretCodes.ts";

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
    private static interactionButton<T extends { id: number }>(entityType: EntityType,
        interactionType: InteractionType, metadata: InteractionMetadata<T>, config: InteractionConfig, entity: T, showCount = true, disabler$?: Signal<boolean>) {
        const { interacted$, count$ } = InteractionStateManager.getOrCreate(
            entityType, entity.id, interactionType,
            metadata.interacted ?? false, metadata.count ?? 0,
        );

        const stateClass$ = compute((s: boolean): string => s ? "active" : "_", interacted$);
        const inertClass = config.toggleable ? "_" : "inert";
        const entityVisibility = (entity as any).visibility;
        const disabledClass$ = compute((u): string => {
            if (!u) return "disabled";
            if (entityVisibility === Visibility.private && inertClass !== "inert") return "disabled";
            if (disabler$?.value) return "disabled";
            return "_";
        }, currentUser);
        const hideOnSmall = interactionType === InteractionType.comment;
        const countVisible = metadata.count !== undefined && metadata.count !== null && showCount;
        const hasSplit = config.toggleable && countVisible;

        if (!config.toggleable) {
            const icon$ = compute(i => i ? config.icons.interacted : config.icons.default, interacted$);
            return create("div")
                .classes("flex", "align-children", hideOnSmall ? "hideOnSmallBreakpoint" : "", disabledClass$)
                .children(
                    GenericTemplates.roundIconButton({
                        icon: icon$,
                        isUrl: icon$.value.includes("http")
                    }, () => toggleInteraction(entityType, interactionType, config, entity.id, interacted$, count$), interactionType,
                        ["positive", stateClass$, "stats-indicator", inertClass]),
                    when(countVisible, create("span")
                        .classes("interaction-count", stateClass$, "hideOnSmallBreakpoint")
                        .text(count$ as HtmlPropertyValue)
                        .build()),
                ).build();
        }

        const icon$ = compute(i => i ? config.icons.interacted : config.icons.default, interacted$);
        const mask$ = compute((url): string => `url("${url}")`, icon$);
        const action = create("button")
            .attributes("type", "button")
            .classes(hasSplit ? "interaction-split-action" : "interaction-icon-only", stateClass$)
            .title(interactionType)
            .onclick(() => toggleInteraction(entityType, interactionType, config, entity.id, interacted$, count$))
            .children(
                create("span")
                    .classes("interaction-icon-mask")
                    .styles("mask-image", mask$, "-webkit-mask-image", mask$)
                    .build(),
            ).build() as HTMLElement;

        const code = entityType === EntityType.track ? getTrackSecretCode(entity.id) : "";
        action.addEventListener("contextmenu", event => {
            event.preventDefault();
            InteractionPeoplePopover.show(
                entityType,
                interactionType,
                entity.id,
                code,
                action,
                {x: event.clientX, y: event.clientY},
            );
        });

        if (!hasSplit) {
            return create("div")
                .classes("flex", disabledClass$)
                .children(action)
                .build();
        }

        const count = create("button")
            .attributes("type", "button")
            .classes("interaction-split-count", stateClass$)
            .title("Show people")
            .onclick((event: MouseEvent) => {
                event.stopPropagation();
                InteractionPeoplePopover.show(
                    entityType,
                    interactionType,
                    entity.id,
                    code,
                    event.currentTarget as HTMLElement,
                );
            })
            .text(compute((value): string => String(value), count$))
            .build();

        return create("div")
            .classes("interaction-split", "flex", "no-gap", "noflexwrap", "align-children", stateClass$, disabledClass$)
            .children(action, count)
            .build();
    }

    static interactions<T>(entityType: EntityType, entity: T, options?: InteractionOptions) {
        let elements: AnyNode[];
        switch (entityType) {
            case EntityType.track:
                elements = InteractionTemplates.trackInteractions(entity as Track, options);
                break;
            case EntityType.album:
                elements = InteractionTemplates.albumInteractions(entity as Album, options);
                break;
            case EntityType.playlist:
                elements = InteractionTemplates.playlistInteractions(entity as Playlist, options);
                break;
            case EntityType.comment:
                elements = InteractionTemplates.commentInteractions(entity as Comment, options);
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
    }>(interactions: InteractionType[], entity: T, entityType: EntityType, options?: InteractionOptions) {
        const elements = [];
        for (const interaction of interactions) {
            const config = interactionConfigs[interaction];
            elements.push(InteractionTemplates.interactionButton(entityType, interaction, entity[interaction + "s" as keyof T] ?? {} as InteractionMetadata<any>, config, entity, options?.showCount, options?.disabled));
        }

        return elements;
    }

    private static trackInteractions(entity: Track, options?: InteractionOptions) {
        const interactions = [InteractionType.like, InteractionType.repost, InteractionType.comment];
        return this.interactionList(options?.overrideActions ?? interactions, entity, EntityType.track, options);
    }

    private static albumInteractions(entity: Album, options?: InteractionOptions) {
        const interactions = [InteractionType.like];
        return this.interactionList(interactions, entity, EntityType.album, options);
    }

    private static playlistInteractions(entity: Playlist, options?: InteractionOptions) {
        const interactions = [InteractionType.like];
        return this.interactionList(interactions, entity, EntityType.playlist, options);
    }

    private static commentInteractions(entity: Comment, options?: InteractionOptions) {
        const interactions = [InteractionType.like];
        return this.interactionList(interactions, entity, EntityType.comment, options);
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