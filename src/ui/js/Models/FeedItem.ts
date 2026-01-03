import { Visibility } from "@targoninc/lyda-shared/dist/Enums/Visibility";
import { Repost } from "@targoninc/lyda-shared/src/Models/db/lyda/Repost";
import { ListTrack } from "@targoninc/lyda-shared/src/Models/ListTrack";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";

export interface FeedItem {
    visibility: Visibility,
    id: number,
    user_id: number,
    user?: User,
    title: string,
    repost?: Repost,
    has_cover?: boolean,
    tracks?: ListTrack[],
    created_at: Date,
    updated_at: Date,
}
