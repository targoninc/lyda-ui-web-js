import {UserTemplates} from "./account/UserTemplates.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";
import {signal, create, when, nullElement} from "@targoninc/jess";
import { icon } from "@targoninc/jess-components";
import {UserWidgetContext} from "../Enums/UserWidgetContext.ts";

export class StatisticsTemplates {
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