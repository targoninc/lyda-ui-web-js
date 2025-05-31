import {QueueManager} from "../../Streaming/QueueManager.ts";
import {horizontal, vertical} from "../generic/GenericTemplates.ts";
import {Util} from "../../Classes/Util.ts";
import {compute, create, nullElement, signal, when} from "@targoninc/jess";
import {Images} from "../../Enums/Images.ts";
import {button, icon} from "@targoninc/jess-components";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {autoQueue, contextQueue, currentTrackId, manualQueue, queueVisible} from "../../state.ts";
import {PlayManager} from "../../Streaming/PlayManager.ts";
import {MusicTemplates} from "./MusicTemplates.ts";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType.ts";
import {startItem} from "../../Actions/MusicActions.ts";
import {TrackTemplates} from "./TrackTemplates.ts";
import {PlayerTemplates} from "./PlayerTemplates.ts";
import {UserTemplates} from "../account/UserTemplates.ts";
import {UserWidgetContext} from "../../Enums/UserWidgetContext.ts";

export class QueueTemplates {
    static queueItem(track: Track, index: number, isManual: boolean) {
        if (!track.user) {
            throw new Error(`Track ${track.id} has no user`);
        }
        const coverState = signal(Images.DEFAULT_COVER_TRACK);
        if (track.has_cover) {
            coverState.value = Util.getTrackCover(track.id);
        }
        const playing = compute(id => id === track.id, currentTrackId);
        const playingClass = compute((p): string => p ? "playing" : "_", playing);

        return create("div")
            .classes("queue-item", "flex", "small-gap", "rounded", "padded-small", "space-outwards", playingClass)
            .on("dblclick", async () => {
                await startItem(EntityType.track, track, null, false)
            })
            .children(
                horizontal(
                    MusicTemplates.cover(EntityType.track, track, "queue-cover", () =>
                        startItem(EntityType.track, track, null, false)),
                    vertical(
                        TrackTemplates.title(track.title, track.id, PlayerTemplates.trackIcons(track), "text-medium"),
                        UserTemplates.userLink(UserWidgetContext.player, track.user!),
                    ).classes("no-gap"),
                ),
                when(isManual, QueueTemplates.manualQueueItemActions(track, index))
            ).id(track.id)
            .build();
    }

    static manualQueueItemActions(track: Track, index: number) {
        return create("div")
            .classes("flex")
            .children(
                button({
                    text: "Up",
                    icon: {icon: "keyboard_arrow_up"},
                    classes: ["align-children"],
                    disabled: index === 0,
                    onclick: async () => {
                        QueueManager.moveInManualQueue(index, index - 1);
                    }
                }),
                button({
                    text: "Down",
                    icon: {icon: "keyboard_arrow_down"},
                    classes: ["align-children"],
                    disabled: compute(q => index === (q.length - 1), manualQueue),
                    onclick: async () => {
                        QueueManager.moveInManualQueue(index, index + 1);
                    }
                }),
                button({
                    text: "Remove",
                    icon: {icon: "close"},
                    classes: ["negative", "align-children"],
                    onclick: async () => {
                        QueueManager.removeFromManualQueue(track.id);
                    }
                })
            ).build()
    }

    static queueButton() {
        return create("div")
            .classes("relative")
            .children(
                create("button")
                    .classes("jess", "relative", compute((v): string => v ? "special" : "_", queueVisible))
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
        const qClass = compute((v): string => v ? "visible" : "hide", queueVisible);

        return create("div")
            .classes("queue-popout", qClass)
            .children(
                vertical(
                    compute(id => QueueTemplates.trackAsQueueItem(id, 0, false), currentTrackId),
                    compute((q) => QueueTemplates.queueList(q, "Manual queue", true), manualQueue),
                    compute((q) => QueueTemplates.queueList(q, "Context queue"), contextQueue),
                    compute((q) => QueueTemplates.queueList(q, "Auto queue"), autoQueue),
                ).classes("padded", "rounded", "fullWidth").build()
            ).build();
    }

    static queueList(q: number[], text: string, isManual: boolean = false) {
        return vertical(
            create("span")
                .classes("color-dim", "text-small")
                .text(text)
                .build(),
            ...q.map((id, i) => QueueTemplates.trackAsQueueItem(id, i, isManual)),
        ).classes("no-gap").build();
    }

    static trackAsQueueItem(id: number, i: number, isManual: boolean) {
        const track = signal<{ track: Track } | null>(null);
        PlayManager.getTrackData(id).then((data: any) => {
            track.value = data;
        });

        return vertical(
            compute(t => t ? QueueTemplates.queueItem(t.track, i, isManual) : nullElement(), track)
        ).classes("relative")
            .build();
    }
}