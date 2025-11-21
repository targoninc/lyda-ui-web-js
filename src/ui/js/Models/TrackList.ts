import { InteractionMetadata } from "@targoninc/lyda-shared/src/Models/InteractionMetadata.ts";
import { TrackLike } from "@targoninc/lyda-shared/src/Models/db/lyda/TrackLike.ts";
import { FeedItem } from "./FeedItem.ts";

export interface TrackList extends FeedItem {
    description: string;
    secretcode: string;
    likes?: InteractionMetadata<TrackLike>;
}