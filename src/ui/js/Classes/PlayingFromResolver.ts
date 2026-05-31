import { PlayingFrom } from "@targoninc/lyda-shared/src/Models/PlayingFrom.ts";
import { FeedType } from "@targoninc/lyda-shared/src/Enums/FeedType.ts";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType.ts";
import { Images } from "../Enums/Images.ts";
import { DefaultImages } from "../Enums/DefaultImages.ts";
import { RoutePath } from "../Routing/routes.ts";
import { Util } from "./Util.ts";

const profileFeedTypes: Set<string> = new Set([
    FeedType.profileTracks,
    FeedType.profileReposts,
    FeedType.likedTracks,
    FeedType.history,
    FeedType.boughtTracks,
]);

const tabParams: Partial<Record<FeedType, string>> = {
    [FeedType.profileTracks]: "?tab=tracks",
    [FeedType.profileReposts]: "?tab=reposts",
    [FeedType.likedTracks]: "?tab=liked",
    [FeedType.history]: "?tab=history",
    [FeedType.boughtTracks]: "?tab=bought",
};

function getDefaultImage(type: FeedType | "album" | "playlist" | undefined): string {
    switch (type) {
        case "album": return DefaultImages[EntityType.album];
        case "playlist": return DefaultImages[EntityType.playlist];
        default:
            if (type && profileFeedTypes.has(type)) return Images.DEFAULT_AVATAR;
            return Images.DEFAULT_COVER_ALBUM;
    }
}

export class PlayingFromResolver {
    static getImageUrl(pf: PlayingFrom | null): string {
        if (!pf?.type) return Images.DEFAULT_COVER_ALBUM;

        switch (pf.type) {
            case "album": {
                if (pf.entity && !pf.entity.has_cover) return DefaultImages[EntityType.album];
                if (pf.id) return Util.getImage(pf.id, MediaFileType.albumCover);
                return DefaultImages[EntityType.album];
            }
            case "playlist": {
                if (pf.entity && !pf.entity.has_cover) return DefaultImages[EntityType.playlist];
                if (pf.id) return Util.getImage(pf.id, MediaFileType.playlistCover);
                return DefaultImages[EntityType.playlist];
            }
            default: {
                if (profileFeedTypes.has(pf.type) && pf.id) {
                    return Util.getImage(pf.id, MediaFileType.userAvatar);
                }
                return getDefaultImage(pf.type);
            }
        }
    }

    static getLink(pf: PlayingFrom | null): string {
        if (!pf?.type) return "";

        switch (pf.type) {
            case "album":
                return pf.id ? `/${RoutePath.album}/${pf.id}` : "";
            case "playlist":
                return pf.id ? `/${RoutePath.playlist}/${pf.id}` : "";
            default: {
                if (profileFeedTypes.has(pf.type) && pf.username) {
                    const tab = tabParams[pf.type as FeedType] ?? "";
                    return `/${RoutePath.profile}/${pf.username}${tab}`;
                }
                if (pf.type === FeedType.following) {
                    const filterParam = pf.filter && pf.filter !== "all" ? `?filter=${pf.filter}` : "";
                    return `/${RoutePath.following}${filterParam}`;
                }
                if (pf.type === FeedType.explore) return `/${RoutePath.explore}`;
                return "";
            }
        }
    }

    static shouldShowImage(pf: PlayingFrom | null): boolean {
        return !!pf?.type;
    }

    static getDefaultImageUrl(pf: PlayingFrom | null): string {
        return getDefaultImage(pf?.type);
    }
}
