import {Icons} from "../../Enums/Icons.ts";
import {Time} from "../../Classes/Helpers/Time.ts";
import {QueueManager} from "../../Streaming/QueueManager.ts";
import {GenericTemplates} from "../GenericTemplates.ts";
import {DragActions} from "../../Actions/DragActions.ts";
import {Util} from "../../Classes/Util.ts";
import {navigate} from "../../Routing/Router.ts";
import {Track} from "../../Models/DbModels/lyda/Track.ts";
import {create} from "../../../fjsc/src/f2.ts";
import {FJSC} from "../../../fjsc";
import {User} from "../../Models/DbModels/lyda/User.ts";
import {compute, signal} from "../../../fjsc/src/signals.ts";
import {Images} from "../../Enums/Images.ts";
import {RoutePath} from "../../Routing/routes.ts";

export class QueueTemplates {
    static queueItem(track: Track, index: number, totalCount: number, attributes = [], classes = []) {
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

    static queue(queue: { track: Track }[]) {
        let children = [];
        let i = 0;
        for (let item of queue) {
            children.push(GenericTemplates.dragTargetInList((data: any) => {
                QueueManager.moveInManualQueue(data.from, data.to);
            }, i.toString()));
            if (!item.track.user) {
                throw new Error(`Track ${item.track.id} has no user`);
            }
            children.push(QueueTemplates.queueItem(item.track, i, queue.length));
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
        const queueListVisClass = compute((h): string => h ? "hidden" : "_", queueListHidden);

        return create("div")
            .classes("relative", "align-center")
            .children(
                create("div")
                    .classes(queueListVisClass, "popout-above", "flex-v", "no-gap", "padded", "rounded")
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
                create("button")
                    .classes("fjsc", "relative", "align-center")
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