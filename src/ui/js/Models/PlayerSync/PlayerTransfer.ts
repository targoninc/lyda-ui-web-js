import type { PlayerState } from "./PlayerState.ts";

export interface PlayerTransfer extends PlayerState {
    sourceDeviceId: string;
    targetDeviceId: string;
}
