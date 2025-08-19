import { PlayManager } from "./PlayManager.ts";
import { PlayerTemplates } from "../Templates/music/PlayerTemplates.ts";
import { currentlyBuffered, currentTrackId, currentTrackPosition, playingHere, trackInfo } from "../state.ts";
import { signal } from "@targoninc/jess";

const updatingPlayState = signal(false);

export class StreamingUpdater {
    static async updatePermanentPlayer() {
        if (!currentTrackId.value) {
            console.log("no currentTrackId");
            return;
        }
        const streamClient = PlayManager.getStreamClient(currentTrackId.value);
        StreamingUpdater.updateBuffers(streamClient.getBufferedLength(), streamClient.duration);
        StreamingUpdater.updateScrubber(currentTrackId.value);

        let trackInfoTmp = trackInfo.value[currentTrackId.value];
        if (trackInfoTmp === undefined) {
            const tmpInfo = await PlayManager.getTrackData(currentTrackId.value);
            if (!tmpInfo) {
                throw new Error(`No track info for ${currentTrackId.value}`);
            }
            trackInfoTmp = tmpInfo;
        }

        const footer = document.querySelector("footer");
        if (!footer) {
            return;
        }
        const existingPlayer = footer.querySelector("#player_" + currentTrackId.value);
        if (existingPlayer !== null) {
            return;
        }
        footer.innerHTML = "";
        if (footer.querySelector("#permanent-player") === null) {
            if (!trackInfoTmp.track.user) {
                throw new Error(`Track ${trackInfoTmp.track.id} has no user`);
            }
            const player = await PlayerTemplates.player(trackInfoTmp.track, trackInfoTmp.track.user);
            footer.appendChild(player);
        }
    }

    static updateScrubber(id: number) {
        const currentTime = PlayManager.getCurrentTime(id);
        const streamClient = PlayManager.getStreamClient(id);
        if (streamClient && streamClient.playing) {
            currentTrackPosition.value = currentTime;
        }

        StreamingUpdater.updateBuffers(streamClient.getBufferedLength(), streamClient.duration);
    }

    static updateBuffers(bufferedLength: number, duration: number) {
        currentlyBuffered.value = Math.min(Math.max(bufferedLength / duration, 0), 1);
    }

    static async updatePlayState() {
        if (updatingPlayState.value) {
            return;
        }
        updatingPlayState.value = true;

        const currentStreamClient = PlayManager.getStreamClient(currentTrackId.value);
        if (currentStreamClient) {
            playingHere.value = currentStreamClient.playing;
        } else {
            playingHere.value = false;
        }

        await StreamingUpdater.updatePermanentPlayer();
        updatingPlayState.value = false;
    }
}