import {PlayManager} from "../../Streaming/PlayManager.ts";
import {currentTrackId} from "../../state.ts";

export function initializeMediaSessionCallbacks() {
    navigator.mediaSession.setActionHandler("play", async () => {
        if (!currentTrackId.value) {
            return;
        }
        await PlayManager.startAsync(currentTrackId.value);
    });

    navigator.mediaSession.setActionHandler("pause", async () => {
        if (!currentTrackId.value) {
            return;
        }
        await PlayManager.pauseAsync(currentTrackId.value);
    });

    navigator.mediaSession.setActionHandler("nexttrack", async () => {
        if (!currentTrackId.value) {
            return;
        }
        await PlayManager.playNextFromQueues();
    });

    navigator.mediaSession.setActionHandler("previoustrack", async () => {
        if (!currentTrackId.value) {
            return;
        }
        await PlayManager.playPreviousFromQueues();
    });

    navigator.mediaSession.setActionHandler("seekto", async (opts: any) => {
        if (!currentTrackId.value) {
            return;
        }
        const d = await PlayManager.getTrackData(currentTrackId.value);
        await PlayManager.scrubTo(currentTrackId.value, opts.seekTime / d.track.length);
    });

    navigator.mediaSession.setActionHandler("seekforward", async () => {
        if (!currentTrackId.value) {
            return;
        }
        await PlayManager.skipForward(currentTrackId.value);
    });

    navigator.mediaSession.setActionHandler("seekbackward", async () => {
        if (!currentTrackId.value) {
            return;
        }
        await PlayManager.skipBackward(currentTrackId.value);
    });
}