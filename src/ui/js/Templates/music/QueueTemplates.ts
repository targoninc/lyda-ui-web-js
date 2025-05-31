import {QueueManager} from "../../Streaming/QueueManager.ts";
import {GenericTemplates, horizontal, vertical} from "../generic/GenericTemplates.ts";
import {DragActions} from "../../Actions/DragActions.ts";
import {Util} from "../../Classes/Util.ts";
import {compute, create, nullElement, signal, when} from "@targoninc/jess";
import {Images} from "../../Enums/Images.ts";
import {button, icon} from "@targoninc/jess-components";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {autoQueue, contextQueue, manualQueue, queueVisible} from "../../state.ts";
import {PlayManager} from "../../Streaming/PlayManager.ts";
import {MusicTemplates} from "./MusicTemplates.ts";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType.ts";
import {startItem} from "../../Actions/MusicActions.ts";
import {TrackTemplates} from "./TrackTemplates.ts";
import {PlayerTemplates} from "./PlayerTemplates.ts";
import {UserTemplates} from "../account/UserTemplates.ts";
import {UserWidgetContext} from "../../Enums/UserWidgetContext.ts";

export class QueueTemplates {
    static queueItem(track: Track, index: number, totalCount: number, isManual: boolean) {
        if (!track.user) {
            throw new Error(`Track ${track.id} has no user`);
        }
        const coverState = signal(Images.DEFAULT_COVER_TRACK);
        if (track.has_cover) {
            coverState.value = Util.getTrackCover(track.id);
        }

        return create("div")
            .children(
                create("div")
                    .classes("queue-draggable", "flex", "small-gap", "rounded", "space-outwards")
                    .children(
                        horizontal(
                            MusicTemplates.cover(EntityType.track, track, "queue-cover", () =>
                                startItem(EntityType.track, track, null, false)),
                            vertical(
                                TrackTemplates.title(track.title, track.id, PlayerTemplates.trackIcons(track), "text-medium"),
                                UserTemplates.userLink(UserWidgetContext.player, track.user!),
                            ).classes("no-gap"),
                        ),
                        when(isManual, QueueTemplates.manualQueueItemActions(track, index, totalCount))
                    ).id(track.id)
                    .build()
            ).build();
    }

    static manualQueueItemActions(track: Track, index: number, totalCount: number) {
        return create("div")
            .classes("flex")
            .children(
                button({
                    text: "Up",
                    icon: { icon: "keyboard_arrow_up" },
                    classes: ["align-children"],
                    disabled: index === 0,
                    onclick: async () => {
                        QueueManager.moveInManualQueue(index, index - 1);
                    }
                }),
                button({
                    text: "Down",
                    icon: { icon: "keyboard_arrow_down" },
                    classes: ["align-children"],
                    disabled: index === totalCount,
                    onclick: async () => {
                        QueueManager.moveInManualQueue(index, index + 1);
                    }
                }),
                button({
                    text: "Remove",
                    icon: { icon: "close" },
                    classes: ["negative", "align-children"],
                    onclick: async () => {
                        QueueManager.removeFromManualQueue(track.id);
                    }
                })
            ).build()
    }

    static queue() {
        return create("div")
            .classes("relative")
            .children(
                create("button")
                    .classes("jess", "relative")
                    .onclick(() => {
                        queueVisible.value = !queueVisible.value;
                    })
                    .children(
                        icon({
                            icon: "queue_music",
                            adaptive: true,
                        }),
                        create("span")
                            .classes("align-center", "nopointer")
                            .text("Queue")
                            .build(),
                    ).build()
            ).build();
    }

    static queuePopout() {
        return create("div")
            .classes("queue-popout", "flex-v", "padded", "rounded")
            .children(
                compute((q) => QueueTemplates.queueList(q, "Manual queue", true), manualQueue),
                compute((q) => QueueTemplates.queueList(q, "Context queue"), contextQueue),
                compute((q) => QueueTemplates.queueList(q, "Auto queue"), autoQueue),
            ).build();
    }

    static queueList(q: number[], text: string, isManual: boolean = false) {
        return vertical(
            create("span")
                .classes("color-dim", "text-small")
                .text(text)
                .build(),
            ...q.flatMap((id, i) => {
                const track = signal<{ track: Track } | null>(null);
                PlayManager.getTrackData(id).then((data: any) => {
                    track.value = data;
                });

                return vertical(
                    compute(t => t ? QueueTemplates.queueItem(t.track, i, q.length, isManual) : nullElement(), track)
                ).classes("relative");
            })
        ).build();
    }
}