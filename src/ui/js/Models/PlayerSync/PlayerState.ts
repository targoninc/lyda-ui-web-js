export interface PlayerState {
    deviceId: string;
    deviceName: string;
    platform: string;
    trackId: number | null;
    position: number;
    duration: number;
    playing: boolean;
}
