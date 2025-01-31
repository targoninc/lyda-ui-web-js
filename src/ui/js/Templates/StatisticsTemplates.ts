import {Icons} from "../Enums/Icons.js";
import {TrackActions} from "../Actions/TrackActions.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {AlbumActions} from "../Actions/AlbumActions.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";
import {create, StringOrSignal} from "../../fjsc/src/f2.ts";
import {FJSC} from "../../fjsc";
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {UserWidgetContext} from "../Enums/UserWidgetContext.ts";
import {GenericTemplates} from "./GenericTemplates.ts";

export class StatisticsTemplates {
    static likesIndicator(type: string, reference_id: number, like_count: number, liked: boolean|Signal<boolean>) {
        const functionMap: Record<string, Function> = {
            "track": TrackActions.toggleLike,
            "album": AlbumActions.toggleLike,
            "playlist": PlaylistActions.toggleLike,
        };
        liked = liked.constructor === Signal ? liked : signal(liked as boolean);
        const toggleClass = compute((l): string => l ? "enabled" : "_", liked);
        const imageState = compute(l => l ? Icons.LIKE : Icons.LIKE_OUTLINE, liked);

        return StatisticsTemplates.toggleIndicator("likes", liked, like_count, imageState, reference_id, functionMap[type], [toggleClass]);
    }

    static repostIndicator(reference_id: number, repost_count: number, reposted: boolean|Signal<boolean>) {
        reposted = reposted.constructor === Signal ? reposted : signal(reposted as boolean);
        const toggleClass = compute((r): string => r ? "enabled" : "_", reposted);

        return StatisticsTemplates.toggleIndicator("reposts", reposted, repost_count, Icons.REPOST, reference_id, TrackActions.toggleRepost, [toggleClass]);
    }

    static toggleIndicator(stats_type: string, toggleObservable: Signal<boolean>, count: number, icon: StringOrSignal, reference_id = -1, clickFunc: Function = () => {}, extraClasses: StringOrSignal[] = []) {
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

        const iconIsUrl = (icon.subscribe && icon.value.startsWith("http")) || icon.startsWith("http");
        const stateClass = compute((s: boolean): string => s ? "active" : "_", toggleObservable);
        const stateClass2 = compute((s: boolean): string => s ? "positive" : "_", toggleObservable);

        return create("div")
            .classes("flex", "stats-indicator")
            .children(
                GenericTemplates.roundIconButton({
                    icon: icon,
                    adaptive: true,
                    isUrl: iconIsUrl,
                }, async () => {
                    const targetValue = !toggleObservable.value;
                    toggleObservable.value = targetValue;
                    clickFunc(reference_id, !targetValue).then((success: boolean) => {
                        if (!success) {
                            toggleObservable.value = !targetValue;
                        }
                    });
                }, "", ["stats-indicator-action", stateClass2, stateClass, ...extraClasses]),
            ).build();
    }

    static genericUserListOpener(type: string, items: any[]) {
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
                    .classes("stats-indicator-opener", type, "clickable", "rounded", "padded-inline")
                    .children(
                        create("span")
                            .text(items.length)
                            .build(),
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

    static likeListOpener(likes: any[]) {
        return this.genericUserListOpener("likes", likes);
    }

    static repostListOpener(reposts: any[]) {
        return this.genericUserListOpener("reposts", reposts);
    }
}