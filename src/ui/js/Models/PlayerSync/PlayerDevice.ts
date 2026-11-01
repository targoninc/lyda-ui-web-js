import type { PlayerState } from "./PlayerState.ts";

export interface PlayerDevice extends PlayerState {
    lastSeen: number;
    local: boolean;
}
