import { ListTrack } from "@targoninc/lyda-shared/src/Models/ListTrack";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { InteractionMetadata } from "@targoninc/lyda-shared/src/Models/InteractionMetadata.ts";
import { TrackLike } from "@targoninc/lyda-shared/src/Models/db/lyda/TrackLike.ts";

export interface TrackList {
    id: number;
    tracks?: ListTrack[];
    user?: User;
    user_id: number;
    title: string;
    description: string;
    created_at: Date;
    updated_at: Date;
    visibility: string;
    has_cover: boolean;
    secretcode: string;
    likes?: InteractionMetadata<TrackLike>;
}