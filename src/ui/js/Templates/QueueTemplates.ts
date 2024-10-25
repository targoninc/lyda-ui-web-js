import {Icons} from "../Enums/Icons.js";
import {Time} from "../Classes/Helpers/Time.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {DragActions} from "../Actions/DragActions.ts";
import {Util} from "../Classes/Util.ts";
import {navigate} from "../Routing/Router.ts";
import {Track} from "../DbModels/Track.ts";
import {computedSignal, create, signal} from "../../fjsc/f2.ts";
import {FJSC} from "../../fjsc";

export class QueueTemplates {
    static async queueItem(track: Track, index, totalCount, user, attributes = [], classes = []) {
        const upButton = create("div")
            .classes("align-center", "fakeButton", "rounded", "padded-inline", "clickablePreserveWidth")
            .alt("Move up in queue")
            .onclick(() => {
                QueueManager.moveInManualQueue(index, index - 1);
            })
            .children(
                FJSC.icon({
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
                FJSC.icon({
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
                            .src(await Util.getCoverFileFromTrackIdAsync(track.id, track.user.id))
                            .alt(track.title)
                            .build(),
                        create("span")
                            .classes("align-center", "clickable")
                            .text(track.user.displayname)
                            .onclick(() => {
                                navigate("profile/" + track.user!.username);
                            }).build(),
                        create("span")
                            .classes("align-center")
                            .text(" - ")
                            .build(),
                        create("span")
                            .classes("align-center", "clickable", "flex-grow")
                            .text(track.title)
                            .onclick(() => {
                                navigate("track/" + track.id);
                            }).build(),
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

    static async queue(queue: any[]) {
        let children = [];
        let i = 0;
        for (let track of queue) {
            children.push(GenericTemplates.dragTargetInList((data: any) => {
                QueueManager.moveInManualQueue(data.from, data.to);
            }, i.toString()));
            children.push(await QueueTemplates.queueItem(track.track, i, queue.length, track.user));
            i++;
        }
        let queueText;
        if (queue.length > 0) {
            let queueTrackLength = 0;
            for (let track of queue) {
                queueTrackLength += track.track.length;
            }
            const queueTrackLengthText = Time.format(queueTrackLength);
            queueText = queue.length === 1 ? "1 track" : `${queue.length} tracks`;
            queueText += ` (${queueTrackLengthText})`;
        } else {
            queueText = "Queue is empty";
        }
        const queueListHidden = signal(true);
        const queueListVisClass = computedSignal<string>(queueListHidden, (h: boolean) => h ? "hidden" : "_");

        return create("div")
            .classes("queue", "flex", "relative", "align-center")
            .children(
                create("div")
                    .classes(queueListVisClass, "queue-list", "flex-v", "no-gap", "padded", "rounded")
                    .styles("width", "max-content")
                    .children(
                        create("div")
                            .classes("flex", "align-center", "justify-center", "text-small")
                            .children(
                                create("span")
                                    .classes("flex-grow")
                                    .text(queueText)
                                    .build(),
                            ).build(),
                        ...children
                    ).build(),
                create("div")
                    .classes("queue-opener", "flex", "align-center", "clickable", "fakeButton", "rounded", "padded-inline", "relative")
                    .onclick(() => {
                        queueListHidden.value = !queueListHidden.value;
                    })
                    .children(
                        FJSC.icon({
                            icon: "queue_music",
                            adaptive: true,
                        }),
                        create("span")
                            .classes("align-center", "nopointer")
                            .text("Queue")
                            .build(),
                        create("div")
                            .classes("queue-bubble", "nopointer")
                            .text(queue.length)
                            .build()
                    ).build()
            ).build();
    }
}