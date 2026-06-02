import { Api } from "../Api/Api.ts";

class PinStateManager {
    private pinned = new Set<string>();

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
    }

    isPinned(entityType: string, entityId: number): boolean {
        return this.pinned.has(this.key(entityType, entityId));
    }

    async pin(entityType: string, entityId: number): Promise<void> {
        await Api.addPin(entityType, entityId);
        this.pinned.add(this.key(entityType, entityId));
    }

    async unpin(entityType: string, entityId: number): Promise<void> {
        await Api.removePin(entityType, entityId);
        this.pinned.delete(this.key(entityType, entityId));
    }
}

export const pinState = new PinStateManager();
