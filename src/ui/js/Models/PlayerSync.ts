export interface PlayerState {
    deviceId: string;
    deviceName: string;
    platform: string;
    trackId: number | null;
    position: number;
    duration: number;
    playing: boolean;
}

export interface PlayerDevice extends PlayerState {
    lastSeen: number;
    local: boolean;
}
