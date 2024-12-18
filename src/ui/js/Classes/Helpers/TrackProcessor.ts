import {Track} from "../../Models/DbModels/Track.ts";

export class TrackProcessor {
    static forDownload(input: Track) {
        const track = structuredClone(input);
        delete track.user;
        delete track.loudness_data;
        delete track.secretcode;
        delete track.comments;
        delete track.likes;
        delete track.plays;
        delete track.playlists;
        delete track.albums;
        delete track.has_cover;
        delete track.collaborators;
        return track;
    }
}