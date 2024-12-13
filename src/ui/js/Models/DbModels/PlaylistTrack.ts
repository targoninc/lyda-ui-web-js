import {Track} from "./Track.js";

export interface PlaylistTrack {
    playlist_id: number;
    track_id: number;
    user_id: number;
    position: number;
    created_at: Date;
    track?: Track;
}