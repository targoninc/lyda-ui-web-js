import type { PlayerQueue } from "./PlayerQueue.ts";

export interface PlayerState {
    deviceId: string;
    deviceName: string;
    platform: string;
    trackId: number | null;
    position: number;
    duration: number;
    playing: boolean;
    queue: PlayerQueue;
}
