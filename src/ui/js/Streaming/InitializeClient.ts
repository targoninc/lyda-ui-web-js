import { IStreamClient } from "./IStreamClient.ts";
import { currentQuality, currentTrackId, currentTrackPosition, muted, volume } from "../state.ts";
import { PlayManager } from "./PlayManager.ts";

export function initializeClient(client: IStreamClient) {
    currentQuality.subscribe(async q => {
        if (client.playing) {
            client.stopAsync();
            const interval = setInterval(async () => {
                if (client.getBufferedLength() >= client.duration) {
                    console.log("Starting because buffer loaded");
                    await client.scrubTo(currentTrackPosition.value.absolute, false, false);
                    await client.startAsync();
                    clearInterval(interval);
                }
            }, 100);
        } else {
            client.stopAsync();
        }
    });

    volume.subscribe(async q => client.setVolume(muted.value ? 0 : q));
    client.setVolume(muted.value ? 0 : volume.value);

    const currentStreamClient = PlayManager.getStreamClient(currentTrackId.value);
    if (!currentStreamClient) {
        client.setVolume(muted.value ? 0 : (volume.value ?? 0.2));
    } else {
        client.setVolume(muted.value ? 0 : currentStreamClient.getVolume());
    }
}