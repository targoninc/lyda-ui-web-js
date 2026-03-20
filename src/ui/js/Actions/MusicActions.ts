import { PlayManager } from "../Streaming/PlayManager.ts";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { QueueManager } from "../Streaming/QueueManager.ts";
import { PlayingFrom } from "@targoninc/lyda-shared/src/Models/PlayingFrom.ts";
import { playingFrom, shuffling } from "../state.ts";
import {shuffleArray} from "../Classes/Util.ts";

export async function startItem(track: Track, newPlayingFrom?: PlayingFrom) {
    if (newPlayingFrom) {
        const currentPf = playingFrom.value;
        const isSameContext = currentPf && currentPf.type === newPlayingFrom.type && currentPf.id === newPlayingFrom.id;

        playingFrom.value = newPlayingFrom;

        if (newPlayingFrom.entity && (!isSameContext || QueueManager.getContextQueue().length === 0)) {
            let trackIds = newPlayingFrom.entity.tracks!.map(t => t.track_id);
            if (shuffling.value) {
                trackIds = shuffleArray(trackIds);
            }
            QueueManager.setContextQueue(trackIds);
        }
    } else {
        // Playing from single track page
        PlayManager.clearPlayFrom();
        QueueManager.clearContextQueue();
    }

    await PlayManager.startAtBeginningAsync(track.id);
}