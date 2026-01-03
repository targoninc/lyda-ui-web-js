import { PlayManager } from "../Streaming/PlayManager.ts";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { QueueManager } from "../Streaming/QueueManager.ts";
import { PlayingFrom } from "@targoninc/lyda-shared/src/Models/PlayingFrom.ts";
import { playingFrom } from "../state.ts";

export async function startItem(track: Track, newPlayingFrom?: PlayingFrom) {
    if (newPlayingFrom) {
        playingFrom.value = newPlayingFrom;

        // Albums + Playlists (until shuffle is ready)
        if (newPlayingFrom.entity) {
            QueueManager.setContextQueue(newPlayingFrom.entity.tracks!.map(t => t.track_id));
        }
    } else {
        // Playing from single track page
        PlayManager.clearPlayFrom();
        QueueManager.clearContextQueue();
    }

    PlayManager.addStreamClientIfNotExists(track.id, track.length);
    await PlayManager.startAsync(track.id);
}