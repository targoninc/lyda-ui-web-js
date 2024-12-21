import {Icons} from "../Enums/Icons.js";
import {TrackActions} from "../Actions/TrackActions.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {AlbumActions} from "../Actions/AlbumActions.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";
import {create, StringOrSignal} from "../../fjsc/src/f2.ts";
import {User} from "../Models/DbModels/User.ts";
import {FJSC} from "../../fjsc";
import {Signal, signal} from "../../fjsc/src/signals.ts";
import {UserWidgetContext} from "../Enums/UserWidgetContext.ts";

export class StatisticsTemplates {
    static likesIndicator(type: string, reference_id: number, like_count: number, liked: boolean) {
        const functionMap = {
            "track": TrackActions.toggleLike,
            "album": AlbumActions.toggleLike,
            "playlist": PlaylistActions.toggleLike,
        };
        const toggleState = signal(liked);
        const toggleClass = signal(liked ? "enabled" : "_");
        const imageState = signal(liked ? Icons.LIKE : Icons.LIKE_OUTLINE);
        toggleState.onUpdate = (value: boolean) => {
            if (Util.isLoggedIn()) {
                toggleClass.value = value ? "enabled" : "_";
                imageState.value = value ? Icons.LIKE : Icons.LIKE_OUTLINE;
            }
        };
        // @ts-ignore
        return StatisticsTemplates.statsIndicator("likes", toggleState, like_count, imageState, reference_id, functionMap[type], [toggleClass]);
    }

    static repostIndicator(reference_id: number, repost_count: number, reposted: boolean) {
        const toggleState = signal(reposted);
        const toggleClass = signal(reposted ? "enabled" : "_");
        toggleState.onUpdate = (value: boolean) => {
            if (Util.isLoggedIn()) {
                toggleClass.value = value ? "enabled" : "_";
            }
        };
        return StatisticsTemplates.statsIndicator("reposts", toggleState, repost_count, Icons.REPOST, reference_id, TrackActions.toggleRepost, [toggleClass]);
    }

    static statsIndicator(stats_type: string, toggleObservable: Signal<boolean>, count: number, icon: StringOrSignal, reference_id = -1, clickFunc: Function = () => {}, extraClasses: StringOrSignal[] = []) {
        const count$ = signal(count);
        toggleObservable.onUpdate = (value: boolean) => {
            if (!Util.isLoggedIn()) {
                return;
            }
            if (value) {
                count$.value = count$.value + 1;
            } else {
                count$.value = count$.value - 1;
            }
        };

        if (stats_type === "likes" || stats_type === "reposts") {
            extraClasses.push("clickable");
        }

        return create("div")
            .classes("stats-indicator", stats_type, "flex", ...extraClasses)
            .attributes("reference_id", reference_id)
            .onclick(async () => {
                const targetValue = !toggleObservable.value;
                toggleObservable.value = targetValue;
                clickFunc(reference_id, !targetValue).then((success: boolean) => {
                    if (!success) {
                        toggleObservable.value = !targetValue;
                    }
                });
            })
            .children(
                create("span")
                    .classes("stats-count", "nopointer", stats_type)
                    .text(count$)
                    .build(),
                FJSC.icon({
                    icon: icon,
                    adaptive: true,
                    classes: ["inline-icon", "svg", "nopointer"],
                    isUrl: (icon.subscribe && icon.value.startsWith("http")) || icon.startsWith("http"),
                }),
            ).build();
    }

    static genericUserListOpener(type: string, items: any[], user: User|null) {
        const openState = signal(false);
        const listClass = signal("hidden");

        openState.onUpdate = (value: boolean) => {
            listClass.value = value ? "visible" : "hidden";
            document.addEventListener("click", e => Util.hideElementIfCondition((e: any) => {
                return !(e.target.parentElement.classList.contains(type)
                    || e.target.classList.contains(type));
            }, `listFromStatsIndicator.${type}`, e), {once: true});
        };

        const itemsList = items.map(item => {
            const avatar = signal(Images.DEFAULT_AVATAR);
            if (item.user.has_avatar) {
                Util.getUserAvatar(item.user_id).then(avatarUrl => {
                    avatar.value = avatarUrl;
                });
            }
            return UserTemplates.userWidget(item.user, Util.arrayPropertyMatchesUser(item.user.follows, "following_user_id"), [], [], UserWidgetContext.list);
        });

        return create("div")
            .classes("listFromStatsOpener", type, "flex", "relative")
            .children(
                create("span")
                    .classes("stats-indicator-opener", "clickable", "rounded", "padded-inline")
                    .children(
                        FJSC.icon({
                            icon: "arrow_drop_down",
                            adaptive: true,
                            classes: ["inline-icon", "svg", "nopointer"],
                        }),
                    ).onclick(() => {
                        openState.value = !openState.value;
                    }).build(),
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
                    ).build()
            ).build();
    }

    static likeListOpener(likes: any[], user: User|null) {
        return this.genericUserListOpener("likes", likes, user);
    }

    static repostListOpener(reposts: any[], user: User|null) {
        return this.genericUserListOpener("reposts", reposts, user);
    }
}