import { Signal, signal } from "@targoninc/jess";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import { InteractionType } from "@targoninc/lyda-shared/src/Enums/InteractionType";

export type ContextType = "list" | "page" | "player";

export interface InteractionEntry {
    interacted$: Signal<boolean>;
    count$: Signal<number>;
}

interface EntityData {
    contexts: Set<ContextType>;
    interactions: Map<InteractionType, InteractionEntry>;
}

const store = new Map<string, EntityData>();

function entityKey(entityType: EntityType, id: number): string {
    return `${entityType}_${id}`;
}

export class InteractionStateManager {
    /**
     * Get or create shared reactive signals for an entity's interaction.
     * If the entry already exists (shared across views), the existing signals
     * are returned untouched so all components stay in sync.
     */
    static getOrCreate(
        entityType: EntityType,
        id: number,
        interactionType: InteractionType,
        initialInteracted: boolean,
        initialCount: number,
    ): InteractionEntry {
        const key = entityKey(entityType, id);
        if (!store.has(key)) {
            store.set(key, { contexts: new Set(), interactions: new Map() });
        }
        const entity = store.get(key)!;
        if (!entity.interactions.has(interactionType)) {
            entity.interactions.set(interactionType, {
                interacted$: signal(initialInteracted),
                count$: signal(initialCount),
            });
        }
        return entity.interactions.get(interactionType)!;
    }

    /** Register that an entity is visible via a given context type. */
    static addContext(entityType: EntityType, id: number, contextType: ContextType): void {
        const key = entityKey(entityType, id);
        if (!store.has(key)) {
            store.set(key, { contexts: new Set(), interactions: new Map() });
        }
        store.get(key)!.contexts.add(contextType);
    }

    /** Remove a context from an entity. If no contexts remain, the entry is deleted. */
    static removeContext(entityType: EntityType, id: number, contextType: ContextType): void {
        const key = entityKey(entityType, id);
        const entity = store.get(key);
        if (!entity) return;
        entity.contexts.delete(contextType);
        if (entity.contexts.size === 0) {
            store.delete(key);
        }
    }

    /**
     * Remove the given context type from every entity.
     * Entries with no remaining contexts are deleted.
     * Call this on route change for "list" and "page".
     */
    static clearContextType(contextType: ContextType): void {
        const toDelete: string[] = [];
        for (const [key, entity] of store.entries()) {
            entity.contexts.delete(contextType);
            if (entity.contexts.size === 0) {
                toDelete.push(key);
            }
        }
        for (const key of toDelete) {
            store.delete(key);
        }
    }
}

