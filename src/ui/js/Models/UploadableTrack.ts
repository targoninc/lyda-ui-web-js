import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";

export interface UploadableTrack extends Partial<Track>, Record<string, any> {
    termsOfService: boolean;
    audioFiles?: FileList | null;
    audioFileName?: string | null;
    coverArtFiles?: FileList | null;
    coverArtFileName?: string | null;
}