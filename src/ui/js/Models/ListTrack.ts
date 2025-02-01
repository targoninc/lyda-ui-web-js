import {Track} from "./DbModels/lyda/Track.ts";

export interface ListTrack {
    track_id: number;
    position: number;
    track?: Track;
}