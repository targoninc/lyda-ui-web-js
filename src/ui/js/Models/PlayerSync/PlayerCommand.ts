export interface PlayerCommand {
    deviceId: string;
    targetDeviceId: string;
    action: "play" | "pause" | "seek" | "next" | "previous";
    position?: number;
}
