import type { PlayerQueue } from "./PlayerQueue.ts";

export interface PlayerQueueSnapshot {
    deviceId: string;
    targetDeviceId: string;
    requestId: string;
    queue: PlayerQueue;
    queueRevision: number;
}
