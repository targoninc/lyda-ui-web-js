import { IStreamClient } from "./IStreamClient.ts";
import { currentQuality, currentTrackId, muted, volume } from "../state.ts";
import { PlayManager } from "./PlayManager.ts";

export function initializeClient(client: IStreamClient) {
    const cleanupKey = `init-client-${Math.random()}`;

    currentQuality.subscribe(async _q => {
        const wasPlaying = client.playing;
        client.stopAsync();
        client.reloadSource();
        if (wasPlaying) {
            await client.startAsync();
        }
    }, cleanupKey);

    volume.subscribe(async q => client.setVolume(muted.value ? 0 : q), cleanupKey);
    client.setVolume(muted.value ? 0 : volume.value);

    const currentStreamClient = PlayManager.getStreamClient(currentTrackId.value);
    if (!currentStreamClient) {
        client.setVolume(muted.value ? 0 : (volume.value ?? 0.2));
    } else {
        client.setVolume(muted.value ? 0 : currentStreamClient.getVolume());
    }

    (client as any)._cleanup = () => {
        currentQuality.unsubscribeKey(cleanupKey);
        volume.unsubscribeKey(cleanupKey);
    };
}