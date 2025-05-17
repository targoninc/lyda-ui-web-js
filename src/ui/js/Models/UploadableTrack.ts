import {Track} from "@targoninc/lyda-shared/dist/Models/db/lyda/Track";

export interface UploadableTrack extends Track, Record<string, any> {
    termsOfService: boolean;
    audioFiles: FileList | null;
    audioFileName: string | null;
    coverArtFiles: FileList | null;
    coverArtFileName: string | null;
}