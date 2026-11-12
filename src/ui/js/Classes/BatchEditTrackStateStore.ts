import {signal} from "@targoninc/jess";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {UploadableTrack} from "../Models/UploadableTrack.ts";
import {BatchEditTrackRowState} from "../Models/BatchEditTrackRowState.ts";
import {ProgressPart} from "../Models/ProgressPart.ts";

const states = new Map<number, BatchEditTrackRowState>();

export function getBatchEditTrackRowState(track: Track): BatchEditTrackRowState {
    const existing = states.get(track.id);
    if (existing) {
        return existing;
    }

    const created: BatchEditTrackRowState = {
        state: signal(track as UploadableTrack),
        audioExists: signal(track.processed),
        progress: signal<ProgressPart | null>(null),
        loading: signal(false),
        coverLoading: signal(false),
        imageState: signal(""),
    };
    states.set(track.id, created);
    return created;
}

export function resetBatchEditTrackRowStates(): void {
    states.clear();
}
