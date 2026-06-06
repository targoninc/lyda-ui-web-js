import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {Genre} from "@targoninc/lyda-shared/src/Enums/Genre";

export interface UploadableTrack extends Partial<Track>, Record<string, any> {
    termsOfService: boolean;
    audioFiles?: FileList | null;
    audioFileName?: string | null;
    coverArtFiles?: FileList | null;
    coverArtFileName?: string | null;
    genres: Genre[];
    genrePredictions?: Genre[];
}