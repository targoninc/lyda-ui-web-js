import {PlayManager} from "./PlayManager.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {Icons} from "../Enums/Icons.ts";
import {QueueManager} from "./QueueManager.ts";
import {PlayerTemplates} from "../Templates/music/PlayerTemplates.ts";
import {
    currentlyBuffered,
    currentTrackId,
    currentTrackPosition,
    playingHere,
    trackInfo
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
            trackInfoTmp = await PlayManager.getTrackData(currentTrackId.value);
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

    static async updateQueue() {
        const queue = QueueManager.getManualQueue();
        const queueDom = document.querySelectorAll(".audio-queueadd") as NodeListOf<HTMLDivElement>;
        for (const queueItem of queueDom) {
            const img = queueItem.querySelector("img");
            const text = queueItem.querySelector("span");
            if (queue.includes(parseInt(queueItem.id))) {
                queueItem.classList.remove("audio-queueadd");
                queueItem.classList.add("audio-queueremove");
                img && (img.src = Icons.UNQUEUE);
                text && (text.innerText = "Unqueue");
            }
        }
        const unqueueDom = document.querySelectorAll(".audio-queueremove");
        for (const unqueueItem of unqueueDom) {
            const img = unqueueItem.querySelector("img");
            const text = unqueueItem.querySelector("span");
            if (!queue.includes(parseInt(unqueueItem.id))) {
                unqueueItem.classList.remove("audio-queueremove");
                unqueueItem.classList.add("audio-queueadd");
                img && (img.src = Icons.QUEUE);
                text && (text.innerText = "Queue");
            }
        }
    }

    static async updatePlayState() {
        if (updatingPlayState.value) {
            return;
        }
        updatingPlayState.value = true;
        const targets = document.querySelectorAll(".audio-player-toggle");

        const currentStreamClient = PlayManager.getStreamClient(currentTrackId.value);
        if (currentStreamClient) {
            playingHere.value = currentStreamClient.playing;
        } else {
            playingHere.value = false;
        }

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