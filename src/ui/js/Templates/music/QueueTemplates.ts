import {Icons} from "../../Enums/Icons.ts";
import {QueueManager} from "../../Streaming/QueueManager.ts";
import {GenericTemplates, vertical} from "../generic/GenericTemplates.ts";
import {DragActions} from "../../Actions/DragActions.ts";
import {Util} from "../../Classes/Util.ts";
import {navigate} from "../../Routing/Router.ts";
import {signal, create, compute, computeAsync, nullElement} from "@targoninc/jess";
import {Images} from "../../Enums/Images.ts";
import {RoutePath} from "../../Routing/routes.ts";
import { icon } from "@targoninc/jess-components";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {autoQueue, contextQueue, manualQueue, queueVisible} from "../../state.ts";
import {PlayManager} from "../../Streaming/PlayManager.ts";

export class QueueTemplates {
    static queueItem(track: Track, index: number, totalCount: number, attributes = [], classes = []) {
        const upButton = create("div")
            .classes("align-center", "fakeButton", "rounded", "padded-inline", "clickablePreserveWidth")
            .alt("Move up in queue")
            .onclick(() => {
                QueueManager.moveInManualQueue(index, index - 1);
            })
            .children(
                icon({
                    icon: "move_up",
                    adaptive: true,
                }),
            ).build();
        const downButton = create("div")
            .classes("align-center", "fakeButton", "rounded", "padded-inline", "clickablePreserveWidth")
            .alt("Move down in queue")
            .onclick(() => {
                QueueManager.moveInManualQueue(index, index + 1);
            })
            .children(
                icon({
                    icon: "move_down",
                    adaptive: true,
                }),
            ).build();
        const buttons = [];
        if (index === 0) {
            upButton.classList.add("nonclickable");
        }
        if (index === totalCount - 1) {
            downButton.classList.add("nonclickable");
        }
        buttons.push(upButton);
        buttons.push(downButton);

        const dragData = {
            type: "queue",
            from: index
        };

        if (!track.user) {
            throw new Error(`Track ${track.id} has no user`);
        }
        const coverState = signal(Images.DEFAULT_COVER_TRACK);
        if (track.has_cover) {
            coverState.value = Util.getTrackCover(track.id);
        }

        return create("div")
            .styles("height", "34px")
            .attributes("draggable", "true")
            .ondragstart(async (e: DragEvent) => {
                DragActions.showDragTargets();
                e.dataTransfer!.setData("text/plain", JSON.stringify(dragData));
                e.dataTransfer!.effectAllowed = "move";
                e.stopPropagation();
            })
            .ondragend(async (e: Event) => {
                DragActions.hideDragTargets();
                e.preventDefault();
                e.stopPropagation();
            })
            .children(
                create("div")
                    .classes("queue-draggable", "flex", "small-gap", "padded-inline", "rounded")
                    .children(
                        create("img")
                            .classes("align-center", "inline-icon", "nopointer")
                            .src(coverState)
                            .alt(track.title)
                            .build(),
                        create("span")
                            .classes("align-center", "clickable")
                            .text(track.user.displayname)
                            .onclick(() => navigate(`${RoutePath.profile}/` + track.user!.username))
                            .build(),
                        create("span")
                            .classes("align-center")
                            .text(" - ")
                            .build(),
                        create("span")
                            .classes("align-center", "clickable", "flex-grow")
                            .text(track.title)
                            .onclick(() => navigate(`${RoutePath.track}/` + track.id))
                            .build(),
                        create("div")
                            .classes("align-center", "fakeButton", "rounded", "padded-inline", "clickablePreserveWidth")
                            .alt("Remove from queue")
                            .onclick(() => {
                                QueueManager.removeFromManualQueue(track.id);
                            })
                            .children(
                                create("img")
                                    .classes("inline-icon", "svg")
                                    .src(Icons.DELETE)
                                    .build()
                            ).build(),
                        ...buttons
                    ).id(track.id)
                    .attributes(...attributes)
                    .classes(...classes)
                    .build()
            ).build();
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
            .classes("queue-popout", "flex-v", "no-gap", "padded", "rounded")
            .children(
                compute((q) => QueueTemplates.queueList(q, true), manualQueue),
                compute((q) => QueueTemplates.queueList(q), contextQueue),
                compute((q) => QueueTemplates.queueList(q), autoQueue),
            ).build();
    }

    static queueList(q: number[], isManual: boolean = false) {
        return vertical(
            ...q.flatMap((id, i) => {
                let specifics = [];
                if (isManual) {
                    specifics.push(GenericTemplates.dragTargetInList((data: any) => {
                        QueueManager.moveInManualQueue(data.from, data.to);
                    }, i.toString()));
                }
                const track = signal<{ track: Track } | null>(null);
                PlayManager.getTrackData(id).then((data: any) => {
                    track.value = data;
                });

                return vertical(
                    ...specifics,
                    compute(t => t ? QueueTemplates.queueItem(t.track, i, q.length) : nullElement(), track)
                );
            })
        ).build();
    }
}