import { Api } from "../Api/Api.ts";
import { signal } from "@targoninc/jess";

class PinStateManager {
    private pinned = new Set<string>();
    changeCount = signal(0);

    private key(entityType: string, entityId: number): string {
        return `${entityType}:${entityId}`;
    }

    async initWithUser(userId: number): Promise<void> {
        this.pinned.clear();
        const data = await Api.getPins(userId);
        if (data?.items) {
            for (const pin of data.items) {
                this.pinned.add(this.key(pin.entity_type, pin.entity_id));
            }
        }
        this.changeCount.value = this.changeCount.value + 1;
    }

    isPinned(entityType: string, entityId: number): boolean {
        return this.pinned.has(this.key(entityType, entityId));
    }

    async pin(entityType: string, entityId: number): Promise<void> {
        await Api.addPin(entityType, entityId);
        this.pinned.add(this.key(entityType, entityId));
        this.changeCount.value = this.changeCount.value + 1;
    }

    async unpin(entityType: string, entityId: number): Promise<void> {
        await Api.removePin(entityType, entityId);
        this.pinned.delete(this.key(entityType, entityId));
        this.changeCount.value = this.changeCount.value + 1;
    }
}

export const pinState = new PinStateManager();
