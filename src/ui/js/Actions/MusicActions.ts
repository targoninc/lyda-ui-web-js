import { PlayManager } from "../Streaming/PlayManager.ts";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { QueueManager } from "../Streaming/QueueManager.ts";
import { PlayingFrom } from "@targoninc/lyda-shared/src/Models/PlayingFrom.ts";
import { playingFrom, shuffling } from "../state.ts";

export async function startItem(track: Track, newPlayingFrom?: PlayingFrom) {
    if (newPlayingFrom) {
        const currentPf = playingFrom.value;
        const isSameContext = currentPf && currentPf.type === newPlayingFrom.type && currentPf.id === newPlayingFrom.id;

        playingFrom.value = newPlayingFrom;

        if (!isSameContext || QueueManager.getContextQueue().length === 0 || QueueManager.lastPopulatedShuffleState !== shuffling.value) {
            await QueueManager.populateContextQueue(newPlayingFrom, shuffling.value);
        }
    } else {
        PlayManager.clearPlayFrom();
        QueueManager.clearContextQueue();
    }

    await PlayManager.startAtBeginningAsync(track.id);
}