import { t } from "../../../locales";
import { FeedType } from "@targoninc/lyda-shared/src/Enums/FeedType.ts";

export function getFeedDisplayName(type: FeedType, userName?: string, filter?: string): string {
    let name: string;
    switch (type) {
        case FeedType.following:
            name = `${t("FOLLOWING")}`;
            break;
        case FeedType.explore:
            name = `${t("EXPLORE")}`;
            break;
        case FeedType.history:
            name = `${t("HISTORY")}`;
            break;
        case FeedType.autoQueue:
            name = `${t("AUTO_QUEUE")}`;
            break;
        case FeedType.boughtTracks:
            name = `${t("BOUGHT_ITEMS")}`;
            break;
        case FeedType.likedTracks:
            name = `${t("LIKED_TRACKS")}`;
            break;
        case FeedType.profileTracks:
            name = `${t("PROFILE_TRACKS", userName)}`;
            break;
        case FeedType.profileReposts:
            name = `${t("PROFILE_REPOSTS", userName)}`;
            break;
        default:
            console.error(`Unknown feed type ${type}`);
            return null;
    }

    if (type === FeedType.following && filter && filter !== "all") {
        return `${name} (${filter})`;
    }
    return name;
}