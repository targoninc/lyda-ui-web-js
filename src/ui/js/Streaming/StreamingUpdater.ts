import {PlayManager} from "./PlayManager.ts";
import {Icons} from "../Enums/Icons.ts";
import {PlayerTemplates} from "../Templates/music/PlayerTemplates.ts";
import {
    currentlyBuffered,
    currentTrackId,
    currentTrackPosition,
    playingHere,
    trackInfo,
} from "../state.ts";
import {signal} from "@targoninc/jess";

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

        const targets = document.querySelectorAll(".audio-player-toggle");
        for (const target of targets) {
            const streamClient = PlayManager.getStreamClient(parseInt(target.id));
            if (streamClient === undefined) {
                continue;
            }
            const img = target.querySelector("img") as HTMLImageElement;
            const text = target.querySelector("span") as HTMLSpanElement;
            if (!img || !text) {
                const i = target.querySelector("i");
                if (i) {
                    if (streamClient.playing) {
                        i.innerText = "pause";
                        text.innerText = "Pause";
                    } else {
                        i.innerText = "play_arrow";
                        text.innerText = "Play";
                    }
                }
                continue;
            }
            if (streamClient.playing) {
                img.src = Icons.PAUSE;
                img.alt = "Pause";
                text.innerText = "Pause";
            } else {
                img.src = Icons.PLAY;
                img.alt = "Play";
                text.innerText = "Play";
            }
            img.classList.remove("spinner-animation");
        }

        await StreamingUpdater.updatePermanentPlayer();
        updatingPlayState.value = false;
    }
}