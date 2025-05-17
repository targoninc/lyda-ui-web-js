import {Icons} from "../Enums/Icons.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {UserTemplates} from "./account/UserTemplates.ts";
import {AlbumActions} from "../Actions/AlbumActions.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";
import {compute, Signal, signal, create, when, nullElement, StringOrSignal, isSignal, asSignal} from "@targoninc/jess";
import {GenericTemplates} from "./generic/GenericTemplates.ts";
import { icon } from "@targoninc/jess-components";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType";
import {UserWidgetContext} from "../Enums/UserWidgetContext.ts";

export class StatisticsTemplates {
    static likesIndicator(type: EntityType, reference_id: number, like_count: number, liked: boolean|Signal<boolean>) {
        const functionMap: Record<EntityType, Function> = {
            [EntityType.track]: TrackActions.toggleLike,
            [EntityType.album]: AlbumActions.toggleLike,
            [EntityType.playlist]: PlaylistActions.toggleLike,
        };
        liked = liked.constructor === Signal ? liked : signal(liked as boolean);
        const toggleClass = compute((l): string => l ? "enabled" : "_", liked);
        const imageState = compute(l => l ? Icons.LIKE : Icons.LIKE_OUTLINE, liked);

        return StatisticsTemplates.toggleIndicator(liked, like_count, imageState, reference_id, functionMap[type], [toggleClass]);
    }

    static repostIndicator(reference_id: number, repost_count: number, reposted: boolean|Signal<boolean>, disabled: Signal<boolean> = signal(false)) {
        reposted = reposted.constructor === Signal ? reposted : signal(reposted as boolean);
        const toggleClass = compute((r): string => r ? "enabled" : "_", reposted);
        const disabledClass = compute((d): string => d ? "disabled" : "_", disabled);

        return StatisticsTemplates.toggleIndicator(reposted, repost_count, Icons.REPOST, reference_id, TrackActions.toggleRepost, [toggleClass, disabledClass]);
    }

    static toggleIndicator(toggleObservable: Signal<boolean>, count: number, icon: StringOrSignal, reference_id = -1, clickFunc: Function = () => {}, extraClasses: StringOrSignal[] = []) {
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

        const iconIsUrl = (isSignal(icon) && asSignal(icon).value.startsWith("http")) || (icon as string).startsWith("http");
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
        const open$ = signal(false);
        open$.subscribe((value: boolean) => {
            if (!value) {
                return;
            }

            function eventWithinSelector(e: MouseEvent, selector: string) {
                const el = document.querySelector(selector);
                return el && e.x > el.clientLeft && e.x < el.clientLeft + el.clientWidth && e.y > el.clientTop && e.y < el.clientTop + el.clientHeight;
            }

            setTimeout(() => {
                document.addEventListener("click", (e) => {
                    if (!eventWithinSelector(e, `.listFromStatsOpener.${type}`)) {
                        open$.value = false;
                    }
                }, {once: true});
            });
        });

        const itemsList = items.map(item => {
            const avatar = signal(Images.DEFAULT_AVATAR);

            if (!item.user) {
                return nullElement();
            }

            if (item.user.has_avatar) {
                avatar.value = Util.getUserAvatar(item.user_id);
            }
            return UserTemplates.userWidget(item.user, Util.userIsFollowing(item.user), [], [], UserWidgetContext.list);
        });

        return create("div")
            .classes("listFromStatsOpener", type, "flex", "relative")
            .children(
                create("span")
                    .classes("stats-indicator-opener", type, "clickable", "rounded", "padded-inline", items.length === 0 ? "disabled" : "_")
                    .onclick(() => {
                        open$.value = !open$.value;
                    })
                    .children(
                        create("span")
                            .text(items.length)
                            .build(),
                        icon({
                            icon: "arrow_drop_down",
                            adaptive: true,
                            classes: ["inline-icon", "svg", "nopointer"],
                        }),
                    ).build(),
                when(open$, create("div")
                    .classes("listFromStatsIndicator", "popout-below", type, "flex-v", "padded", "rounded")
                    .children(
                        create("span")
                            .classes("text", "label", "padded-inline", "rounded", "text-small")
                            .text(type.charAt(0).toUpperCase() + type.slice(1))
                            .build(),
                        create("div")
                            .classes("flex-v")
                            .children(...itemsList)
                            .build()
                    ).build())
            ).build();
    }

    static likeListOpener(likes: any[]) {
        return this.genericUserListOpener("likes", likes);
    }

    static repostListOpener(reposts: any[]) {
        return this.genericUserListOpener("reposts", reposts);
    }
}