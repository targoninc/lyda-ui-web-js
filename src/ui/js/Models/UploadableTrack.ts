import {Track} from "./DbModels/Track.ts";

export interface UploadableTrack extends Track {
    termsOfService: boolean;
}