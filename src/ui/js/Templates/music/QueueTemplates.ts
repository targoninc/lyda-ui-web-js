import { QueueManager } from "../../Streaming/QueueManager.ts";
import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { userHasSettingValue, Util } from "../../Classes/Util.ts";
import { compute, create, nullElement, signal, StringOrSignal, when } from "@targoninc/jess";
import { Images } from "../../Enums/Images.ts";
import { button, icon } from "@targoninc/jess-components";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {
    autoQueue,
    contextQueue,
    currentTrackId,
    currentUser,
    history,
    manualQueue,
    queueVisible,
} from "../../state.ts";
import { PlayManager } from "../../Streaming/PlayManager.ts";
import { MusicTemplates } from "./MusicTemplates.ts";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType.ts";
import { startItem } from "../../Actions/MusicActions.ts";
import { TrackTemplates } from "./TrackTemplates.ts";
import { PlayerTemplates } from "./PlayerTemplates.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { UserWidgetContext } from "../../Enums/UserWidgetContext.ts";
import { DragActions } from "../../Actions/DragActions.ts";
import { UserSettings } from "@targoninc/lyda-shared/src/Enums/UserSettings";

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

        const dragData = {
            type: "track",
            id: track.id,
            index,
        };

        const base = create("div")
            .classes("queue-item", "flex", "fullWidth", "small-gap", "rounded", "padded-small", "space-outwards", playingClass);

        if (isManual) {
            base.attributes("draggable", "true")
                .ondragstart(async (e: DragEvent) => {
                    DragActions.showDragTargets();
                    e.dataTransfer!.setData("text/plain", JSON.stringify(dragData));
                    e.dataTransfer!.effectAllowed = "move";
                    e.stopPropagation();
                })
                .ondragend(async (e) => {
                    DragActions.hideDragTargets();
                    e.preventDefault();
                    e.stopPropagation();
                });
        }

        return base
            .on("dblclick", async () => {
                await startItem(EntityType.track, track);
            })
            .children(
                horizontal(
                    when(isManual, GenericTemplates.verticalDragIndicator()),
                    MusicTemplates.cover(EntityType.track, track, "queue-cover", async () => {
                        await startItem(EntityType.track, track);
                        QueueManager.removeIndexFromManualQueue(index);
                    }),
                    vertical(
                        TrackTemplates.title(track.title, track.id, PlayerTemplates.trackIcons(track), "text-medium"),
                        UserTemplates.userLink(UserWidgetContext.player, track.user!),
                    ).classes("no-gap"),
                ),
                when(isManual, QueueTemplates.manualQueueItemActions(index)),
            ).id(track.id).build();
    }

    static manualQueueItemActions(index: number) {
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
                    },
                }),
                button({
                    text: "Down",
                    icon: { icon: "keyboard_arrow_down" },
                    classes: ["align-children"],
                    disabled: compute(q => index === (q.length - 1), manualQueue),
                    onclick: async () => {
                        QueueManager.moveInManualQueue(index, index + 1);
                    },
                }),
                button({
                    text: "Remove",
                    icon: { icon: "close" },
                    classes: ["negative", "align-children"],
                    onclick: async () => {
                        QueueManager.removeIndexFromManualQueue(index);
                    },
                }),
            ).build();
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
                    ).build(),
            ).build();
    }

    static queuePopout() {
        const qClass = compute((v): string => v ? "visible" : "hide", queueVisible);
        queueVisible.subscribe(v => {
            if (v) {
                document.querySelector(`.current-track`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }
        });

        return create("div")
            .classes("queue-popout", qClass)
            .children(
                QueueTemplates.fullQueueList(["padded", "rounded"]),
            ).build();
    }

    static fullQueueList(classes: StringOrSignal[] = []) {
        const playFromAutoEnabled = compute(u => {
            return u && userHasSettingValue(u, UserSettings.playFromAutoQueue, true);
        }, currentUser);

        return vertical(
            compute((q) => QueueTemplates.queueList(q.map(i => i.track_id), "History"), history),
            compute(id => QueueTemplates.queueList([id], "Current track", false, true), currentTrackId),
            compute((q) => QueueTemplates.queueList(q, "Manual queue", true), manualQueue),
            compute((q) => QueueTemplates.queueList(q, "Context queue"), contextQueue),
            when(playFromAutoEnabled, vertical(
                compute((q) => QueueTemplates.queueList(q, "Auto queue"), autoQueue),
            ).build()),
            create("div")
                .classes("queue-spacer")
                .build(),
        ).classes("fullWidth", ...classes).build();
    }

    static queueList(q: number[], text: string, isManual: boolean = false, isCurrent: boolean = false) {
        if (q.length === 0) {
            return nullElement();
        }

        return vertical(
            create("span")
                .classes("color-dim", "text-small")
                .text(text)
                .build(),
            ...q.map((id, i) => QueueTemplates.trackAsQueueItem(id, i, isManual)),
        ).classes("no-gap", isCurrent ? "current-track" : "_")
         .build();
    }

    static trackAsQueueItem(id: number, i: number, isManual: boolean) {
        const track = signal<{ track: Track } | null>(null);
        PlayManager.getTrackData(id).then((data: any) => {
            track.value = data;
        });

        let parent = horizontal().classes("fullWidth");
        if (isManual) {
            parent = GenericTemplates.dragTargetInList(async (data: any) => {
                QueueManager.moveInManualQueue(data.index, i);
            }, i.toString()).classes("fullWidth");
        }

        return vertical(
            parent.children(
                compute(t => t ? QueueTemplates.queueItem(t.track, i, isManual) : nullElement(), track),
            ).build(),
        ).classes("relative")
         .build();
    }
}