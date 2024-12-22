import {Track} from "./DbModels/lyda/Track.ts";

export interface UploadableTrack extends Track {
    termsOfService: boolean;
    audioFiles: FileList | null;
    audioFileName: string | null;
    coverArtFiles: FileList | null;
    coverArtFileName: string | null;
}