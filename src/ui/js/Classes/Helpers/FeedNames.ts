import { t } from "../../../locales";
import { FeedType } from "@targoninc/lyda-shared/src/Enums/FeedType.ts";

export function getFeedDisplayName(type: FeedType, userName?: string): string {
    switch (type) {
        case FeedType.following:
            return `${t("FOLLOWING")}`;
        case FeedType.explore:
            return `${t("EXPLORE")}`;
        case FeedType.history:
            return `${t("HISTORY")}`;
        case FeedType.autoQueue:
            return `${t("AUTO_QUEUE")}`;
        case FeedType.boughtTracks:
            return `${t("BOUGHT_ITEMS")}`;
        case FeedType.likedTracks:
            return `${t("LIKED_TRACKS")}`;
        case FeedType.profileTracks:
            return `${t("PROFILE_TRACKS", userName)}`;
        case FeedType.profileReposts:
            return `${t("PROFILE_REPOSTS", userName)}`;
        default:
            console.error(`Unknown feed type ${type}`);
            return null;
    }
}