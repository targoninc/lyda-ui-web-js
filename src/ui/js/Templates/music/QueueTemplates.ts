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
import { PlayerTemplates } from "./PlayerTemplates.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { UserWidgetContext } from "../../Enums/UserWidgetContext.ts";
import { DragActions } from "../../Actions/DragActions.ts";
import { UserSettings } from "@targoninc/lyda-shared/src/Enums/UserSettings";
import { t } from "../../../locales";
import { CoverContext } from "../../Enums/CoverContext.ts";

export class QueueTemplates {
    static queueItem(track: Track, index: number, isManual: boolean, isCurrent: boolean = false) {
        if (!track.user) {
            throw new Error(`Track ${track.id} has no user`);
        }
        const coverState = signal(Images.DEFAULT_COVER_TRACK);
        if (track.has_cover) {
            coverState.value = Util.getTrackCover(track.id);
        }
        const playing = compute(id => id === track.id, currentTrackId);
        const playingClass = compute((p): string => (p && isCurrent) ? "playing" : "_", playing);

        const dragData = {
            type: "track",
            id: track.id,
            index,
        };

        const base = create("div")
            .classes("queue-item", "flex", "fullWidth", "small-gap", "rounded", "padded-small", "space-between", playingClass);

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
                await startItem(track);
            })
            .children(
                horizontal(
                    when(isManual, GenericTemplates.verticalDragIndicator()),
                    MusicTemplates.cover(EntityType.track, track, CoverContext.queue, async () => {
                        await startItem(track);
                        QueueManager.removeIndexFromManualQueue(index);
                    }),
                    vertical(
                        MusicTemplates.title(EntityType.track, track.title, track.id, PlayerTemplates.trackIcons(track), "text-medium"),
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
                    text: t("UP"),
                    icon: { icon: "keyboard_arrow_up" },
                    classes: ["align-children"],
                    disabled: index === 0,
                    onclick: async () => {
                        QueueManager.moveInManualQueue(index, index - 1);
                    },
                }),
                button({
                    text: t("DOWN"),
                    icon: { icon: "keyboard_arrow_down" },
                    classes: ["align-children"],
                    disabled: compute(q => index === (q.length - 1), manualQueue),
                    onclick: async () => {
                        QueueManager.moveInManualQueue(index, index + 1);
                    },
                }),
                button({
                    text: t("REMOVE"),
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
                            .text(t("QUEUE"))
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
            compute((q) => QueueTemplates.queueList(q.map(i => i.track_id).slice(0, q.length - 1), t("HISTORY")), history),
            compute(id => QueueTemplates.queueList([id], t("CURRENT_TRACK"), false, true), currentTrackId),
            compute((q) => QueueTemplates.queueList(q, t("MANUAL_QUEUE"), true), manualQueue),
            compute((q) => QueueTemplates.queueList(q, t("CONTEXT_QUEUE")), contextQueue),
            when(playFromAutoEnabled, vertical(
                compute((q) => QueueTemplates.queueList(q, t("AUTO_QUEUE")), autoQueue),
            ).build()),
            create("div")
                .classes("queue-spacer")
                .build(),
        ).classes("fullWidth", ...classes).build();
    }

    static queueList(q: number[], text: StringOrSignal, isManual: boolean = false, isCurrent: boolean = false) {
        if (q.length === 0) {
            return nullElement();
        }

        return vertical(
            create("span")
                .classes("color-dim", "text-small")
                .text(text)
                .build(),
            ...q.map((id, i) => QueueTemplates.trackAsQueueItem(id, i, isManual, isCurrent)),
        ).classes("no-gap", isCurrent ? "current-track" : "_")
         .build();
    }

    static trackAsQueueItem(id: number, i: number, isManual: boolean, isCurrent: boolean = false) {
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
                compute(t => t ? QueueTemplates.queueItem(t.track, i, isManual, isCurrent) : nullElement(), track),
            ).build(),
        ).classes("relative")
         .build();
    }
}