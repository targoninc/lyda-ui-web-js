import {Track} from "./DbModels/Track.ts";

export interface UploadableTrack extends Track {
    termsOfService: boolean;
    audioFiles: FileList | null;
    audioFileName: string | null;
    coverArtFiles: FileList | null;
    coverArtFileName: string | null;
}