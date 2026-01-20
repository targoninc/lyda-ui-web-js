import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track.ts";

export interface ContentIDMatch {
    track: Track;
    matches: {
        track: Track;
        similarity: number;
        heuristic: string;
    }[];
}