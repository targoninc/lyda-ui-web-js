import {Icons} from "../Enums/Icons.js";
import {TrackActions} from "../Actions/TrackActions.ts";
import {create, signal} from "https://fjs.targoninc.com/f.js";
import {UserTemplates} from "./UserTemplates.ts";
import {AlbumActions} from "../Actions/AlbumActions.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";

export class StatisticsTemplates {
    static likesIndicator(type, reference_id, like_count, liked) {
        const functionMap = {
            "track": TrackActions.toggleLike,
            "album": AlbumActions.toggleLike,
            "playlist": PlaylistActions.toggleLike,
        };
        const toggleState = signal(liked);
        const toggleClass = signal(liked ? "enabled" : "_");
        const imageState = signal(liked ? Icons.LIKE : Icons.LIKE_OUTLINE);
        toggleState.onUpdate = (value) => {
            if (Util.isLoggedIn()) {
                toggleClass.value = value ? "enabled" : "_";
                imageState.value = value ? Icons.LIKE : Icons.LIKE_OUTLINE;
            }
        };
        return StatisticsTemplates.statsIndicator("likes", toggleState, like_count, "Like", imageState, reference_id, functionMap[type], [toggleClass]);
    }

    static repostIndicator(reference_id, repost_count, reposted) {
        const toggleState = signal(reposted);
        const toggleClass = signal(reposted ? "enabled" : "_");
        toggleState.onUpdate = (value) => {
            if (Util.isLoggedIn()) {
                toggleClass.value = value ? "enabled" : "_";
            }
        };
        return StatisticsTemplates.statsIndicator("reposts", toggleState, repost_count, "Repost", Icons.REPOST, reference_id, TrackActions.toggleRepost, [toggleClass]);
    }

    static statsIndicator(stats_type, toggleObservable, count, statdisplay, image_src, reference_id = -1, clickFunc = () => {
    }, extraClasses = []) {
        const countState = signal(count);
        toggleObservable.onUpdate = (value) => {
            if (!Util.isLoggedIn()) {
                return;
            }
            if (value) {
                countState.value = countState.value + 1;
            } else {
                countState.value = countState.value - 1;
            }
        };

        if (stats_type === "likes" || stats_type === "reposts") {
            extraClasses.push("clickable");
        }

        return create("div")
            .classes("stats-indicator", stats_type, "flex", ...extraClasses)
            .attributes("reference_id", reference_id)
            .onclick(() => {
                if (clickFunc(reference_id, toggleObservable.value)) {
                    toggleObservable.value = !toggleObservable.value;
                }
            })
            .children(
                create("span")
                    .classes("stats-count", "nopointer", stats_type)
                    .text(countState)
                    .build(),
                create("img")
                    .classes("nopointer", "inline-icon", "svg")
                    .attributes("src", image_src, "alt", "Icon")
                    .build()
            ).build();
    }

    static genericUserListOpener(type, track_id, items, user) {
        const openState = signal(false);
        const listClass = signal("hidden");

        openState.onUpdate = (value) => {
            listClass.value = value ? "visible" : "hidden";
            document.addEventListener("click", Util.hideElementIfCondition.bind(null, e => {
                return !(e.target.parentElement.classList.contains(type)
                    || e.target.classList.contains(type));
            }, `listFromStatsIndicator.${type}`), {once: true});
        };

        const itemsList = items.map(item => {
            const avatar = signal(Images.DEFAULT_AVATAR);
            Util.getAvatarFromUserIdAsync(item.user_id).then(avatarUrl => {
                avatar.value = avatarUrl;
            });
            return UserTemplates.userWidget(item.user_id, item.user.username, item.user.displayname, avatar, Util.arrayPropertyMatchesUser(item.user.follows, "followingUserId", user));
        });

        return create("div")
            .classes("listFromStatsOpener", type, "flex", "relative")
            .children(
                create("span")
                    .classes("stats-indicator-opener", "clickable", "rounded", "padded-inline")
                    .children(
                        create("img")
                            .classes("inline-icon", "svg", "nopointer")
                            .src(Icons.DROPDOWN)
                            .build(),
                    )
                    .onclick(() => {
                        openState.value = !openState.value;
                    })
                    .build(),
                create("div")
                    .classes("listFromStatsIndicator", "popout-below", type, "flex-v", "padded", "rounded", listClass)
                    .children(
                        create("span")
                            .classes("text", "label", "padded-inline", "rounded", "text-small")
                            .text(type.charAt(0).toUpperCase() + type.slice(1))
                            .build(),
                        create("div")
                            .classes("flex-v")
                            .children(...itemsList)
                            .build()
                    )
                    .build()
            )
            .build();
    }

    static likeListOpener(track_id, likes, user) {
        return this.genericUserListOpener("likes", track_id, likes, user);
    }

    static repostListOpener(track_id, reposts, user) {
        return this.genericUserListOpener("reposts", track_id, reposts, user);
    }
}