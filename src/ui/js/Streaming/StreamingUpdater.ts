import {PlayManager} from "./PlayManager.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {Icons} from "../Enums/Icons.js";
import {LydaCache} from "../Cache/LydaCache.ts";
import {CacheItem} from "../Cache/CacheItem.ts";
import {QueueTemplates} from "../Templates/QueueTemplates.ts";
import {QueueManager} from "./QueueManager.ts";
import {PlayerTemplates} from "../Templates/PlayerTemplates.ts";
import {Util} from "../Classes/Util.ts";
import {currentlyBuffered, currentTrackId, currentTrackPosition, manualQueue, trackInfo} from "../state.ts";
import {signal} from "../../fjsc/src/signals.ts";

const updatingPlayState = signal(false);

export class StreamingUpdater {
    static updatePlayingIndicators() {
        const playingElements = document.querySelectorAll(".playing");
        for (const playingElement of playingElements) {
            playingElement.classList.remove("playing");
        }
        const listTracks = document.querySelectorAll(".list-track[track_id='" + currentTrackId.value + "']");
        for (const listTrack of listTracks) {
            listTrack.classList.add("playing");
        }
        const inlineTracks = document.querySelectorAll(".inlineTrack[track_id='" + currentTrackId.value + "']");
        for (const inlineTrack of inlineTracks) {
            inlineTrack.classList.add("playing");
        }
        const trackCards = document.querySelectorAll(".track-card[track_id='" + currentTrackId.value + "']");
        for (const trackCard of trackCards) {
            trackCard.classList.add("playing");
        }
    }

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
            const user = await Util.getUserAsync();
            if (!trackInfoTmp.track.user) {
                throw new Error(`Track ${trackInfoTmp.track.id} has no user`);
            }
            const player = await PlayerTemplates.player(trackInfoTmp.track, trackInfoTmp.track.user, user);
            footer.appendChild(player);
        }
    }

    static updateLoopStates(loopingSingle: boolean, loopingContext: boolean) {
        const loopSingleButtons = document.querySelectorAll(".loop-button-img") as NodeListOf<HTMLImageElement>;
        for (const loopButton of loopSingleButtons) {
            loopButton.src = loopingSingle ? Icons.LOOP_SINGLE : Icons.LOOP_OFF;
            loopButton.src = loopingContext ? Icons.LOOP_CONTEXT : loopButton.src;
        }

        const streamClient = PlayManager.getStreamClient(currentTrackId.value);
        streamClient.audio.loop = loopingSingle;
    }

    static updateScrubber(id: number) {
        const currentTime = PlayManager.getCurrentTime(id);
        const streamClient = PlayManager.getStreamClient(id);
        if (streamClient && streamClient.playing) {
            currentTrackPosition.value = currentTime;
        }
        const scrubTimesCurrent = document.querySelectorAll(".audio-player-time-current") as NodeListOf<HTMLSpanElement>;
        for (const scrubTimeCurrent of scrubTimesCurrent) {
            if (scrubTimeCurrent.id !== id.toString()) {
                continue;
            }
            scrubTimeCurrent.innerText = Time.format(currentTime.absolute);
        }

        const waveforms = document.querySelectorAll(".waveform");
        const barCount = 150;
        for (const waveform of waveforms) {
            if (waveform.id !== id.toString()) {
                continue;
            }
            const waveformBars = waveform.querySelectorAll(".waveform-bar");
            const barsBefore = Math.floor(currentTime.relative * barCount);
            const barsAfter = barCount - barsBefore;
            for (let i = 0; i < barsBefore; i++) {
                waveformBars[i]?.classList.add("active");
            }
            for (let i = barsBefore; i < barsBefore + barsAfter; i++) {
                waveformBars[i]?.classList.remove("active");
            }
        }
    }

    static updateBuffers(bufferedLength: number, duration: number) {
        currentlyBuffered.value = Math.min(Math.max(bufferedLength / duration, 0), 1);
    }

    static updateMuteState(id: number) {
        const streamClient = PlayManager.getStreamClient(id);
        const targets = document.querySelectorAll(".loudness-control-icon") as NodeListOf<HTMLImageElement>;
        for (const target of targets) {
            if (target.id !== id.toString()) {
                continue;
            }
            if (streamClient.getVolume() > 0) {
                target.src = Icons.LOUD;
            } else {
                target.src = Icons.MUTE;
            }
        }
    }

    static updateLoudness(id: number, value: number) {
        const loudnessBars = document.querySelectorAll(".audio-player-loudnesshead") as NodeListOf<HTMLDivElement>;
        const cssWidth = value * 100;
        for (const loudnessBar of loudnessBars) {
            if (loudnessBar.id !== id.toString()) {
                continue;
            }
            loudnessBar.style.bottom = `${cssWidth}%`;
        }
    }

    static async updateQueue() {
        LydaCache.set("manualQueue", new CacheItem(manualQueue.value));

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

        const queueContainer = document.querySelector(".queue");
        if (queueContainer) {
            const queue = QueueManager.getManualQueue();
            const tasks = queue.map((id: number) => PlayManager.getTrackData(id));
            const trackList = await Promise.all(tasks);
            // TODO: Fix queue updates :D
            /*const queueList = queueContainer.querySelector(".queue-list");
            const newQueueContainer = await QueueTemplates.queue(trackList);
            queueContainer.replaceWith(newQueueContainer);*/
        }
    }

    static async updatePlayState() {
        if (updatingPlayState.value) {
            return;
        }
        updatingPlayState.value = true;
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

        StreamingUpdater.updatePlayingIndicators();
        await StreamingUpdater.updatePermanentPlayer();
        updatingPlayState.value = false;
    }

    static enableBuffering() {
        const targets = document.querySelectorAll(".audio-player-toggle");
        for (const target of targets) {
            const streamClient = PlayManager.getStreamClient(parseInt(target.id));
            if (streamClient === undefined) {
                continue;
            }
            const img = target.querySelector("img");
            const text = target.querySelector("span");
            if (!img || !text) {
                continue;
            }
            img.src = Icons.SPINNER;
            img.alt = "Buffering";
            img.classList.add("spinner-animation");
            text.innerText = "Buffering";
        }
    }

    static disableBuffering() {
        StreamingUpdater.updatePlayState().then();
    }
}