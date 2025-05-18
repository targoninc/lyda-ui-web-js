import {GenericTemplates} from "./generic/GenericTemplates.ts";
import {Icons} from "../Enums/Icons.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {UserTemplates} from "./account/UserTemplates.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";
import { compute, create, Signal, when, signalMap, signal, AnyElement, InputType } from "@targoninc/jess";
import { textarea, button, input } from "@targoninc/jess-components";
import {Comment} from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import {UserWidgetContext} from "../Enums/UserWidgetContext.ts";

export class CommentTemplates {
    static commentListFullWidth(track_id: number, comments: Signal<Comment[]>, showComments: Signal<boolean>) {
        const hasComments = compute(c => c.length > 0, comments);
        const nestedComments = compute(c => Util.nestComments(c), comments);

        return create("div")
            .classes("listFromStatsIndicator", "move-to-new-row", "comments", "flex-v")
            .children(
                when(showComments, create("div")
                    .classes("flex-v")
                    .children(
                        when(hasComments, create("span")
                            .classes("text", "no-comments")
                            .text("No comments yet")
                            .build(), true),
                        when(hasComments, signalMap(nestedComments, create("div").classes("flex-v", "comment-list"),
                            (comment: Comment) => CommentTemplates.commentInList(comment, comments))),
                        CommentTemplates.commentBox(track_id, comments),
                    ).build()),
            ).build();
    }

    static commentBox(track_id: number, comments: Signal<Comment[]>) {
        const newComment = signal("");

        return create("div")
            .classes("flex-v")
            .children(
                when(Util.isLoggedIn(), create("div")
                    .classes("comment-box-input-container", "flex-v", "fullWidth")
                    .children(
                        textarea({
                            classes: ["comment-box-input"],
                            name: "comment-box-input",
                            placeholder: "New comment...",
                            value: newComment,
                            attributes: ["track_id", track_id.toString()],
                            onchange: v => newComment.value = v,
                        }),
                        button({
                            text: "Post",
                            icon: { icon: "send" },
                            classes: ["positive"],
                            onclick: () => TrackActions.newComment(newComment, comments, track_id)
                        }),
                    ).build())
            ).build();
    }

    static commentInList(comment: Comment, comments: Signal<Comment[]>): AnyElement {
        if (!comment.user) {
            throw new Error(`Comment ${comment.id} has no user`);
        }
        const avatarState = signal(Images.DEFAULT_AVATAR);
        if (comment.user.has_avatar) {
            avatarState.value = Util.getUserAvatar(comment.user_id);
        }
        const replyInputShown = signal(false);
        const repliesShown = signal(false);
        const newComment = signal("");

        return create("div")
            .classes("comment-in-list", "flex-v", "small-gap")
            .id(comment.id)
            .attributes("parent_id", comment.parent_id)
            .children(
                create("div")
                    .classes("flex-v", "small-gap")
                    .children(
                        CommentTemplates.commentContent(comment),
                        create("span")
                            .classes("text", "text-small", "color-dim")
                            .text(Time.agoUpdating(new Date(comment.created_at)))
                            .build(),
                    ).build(),
                create("div")
                    .classes("flex")
                    .children(
                        UserTemplates.userWidget(comment.user, Util.userIsFollowing(comment.user), ["comment_id", comment.id], [], UserWidgetContext.comment),
                        create("div")
                            .classes("flex")
                            .children(
                                when(comment.canEdit, button({
                                    text: "Delete",
                                    icon: { icon: "delete" },
                                    classes: ["negative"],
                                    onclick: () => TrackActions.deleteComment(comment.id, comments)
                                }))
                            ).build(),
                        when(Util.isLoggedIn(), CommentTemplates.commentReplySection(repliesShown, replyInputShown, comment, newComment, comments)),
                    ).build(),
                when(repliesShown, create("div")
                    .classes("comment-children", "flex-v")
                    .children(...(comment.comments?.map(c => CommentTemplates.commentInList(c, comments)) ?? []))
                    .build())
            ).build();
    }

    private static commentReplySection(repliesShown: Signal<boolean>, replyInputShown: Signal<boolean>, comment: Comment, newComment: Signal<string>, comments: Signal<Comment[]>) {
        const len = comment.comments?.length ?? 0;

        return create("div")
            .classes("flex")
            .children(
                when(len > 0, button({
                    text: compute((r): string => {
                        return `${len} repl${len === 1 ? "y" : "ies"} ${r ? "shown" : "hidden"}`;
                    }, repliesShown),
                    disabled: len === 0,
                    icon: {icon: compute((s): string => s ? "visibility" : "visibility_off", repliesShown)},
                    onclick: () => repliesShown.value = !repliesShown.value
                })),
                button({
                    text: "Reply",
                    icon: {icon: compute((r): string => r ? "close" : "reply", replyInputShown)},
                    classes: ["positive"],
                    onclick: () => replyInputShown.value = !replyInputShown.value
                }),
                when(replyInputShown, input<string>({
                    type: InputType.text,
                    name: "reply-input",
                    label: "",
                    placeholder: "Reply to " + comment.user!.username + "...",
                    value: newComment,
                    attributes: ["track_id", comment.track_id.toString()],
                    onchange: v => {
                        newComment.value = v;
                    }
                })),
                when(replyInputShown, button({
                    text: "Post",
                    icon: {icon: "send"},
                    classes: ["positive"],
                    onclick: () => TrackActions.newComment(newComment, comments, comment.track_id, comment.id)
                }))
            ).build();
    }

    static commentContent(comment: Comment) {
        if (comment.hidden) {
            const contentShown = signal(false);

            return create("div")
                .classes("text", "comment_content", "text-small", "flex", "noflexwrap", "fullWidth")
                .children(
                    when(contentShown, create("div")
                        .classes("color-dim", "flex", "noflexwrap", "fullWidth")
                        .onclick(() => {
                            contentShown.value = !contentShown.value;
                        }).children(
                            GenericTemplates.icon(Icons.WARNING, true),
                            create("i")
                                .classes("text", "comment_content", "text-small", "fullWidth")
                                .text("This comment has been hidden. Click to show anyway.")
                                .build()
                        ).build(), true),
                    when(contentShown, create("span")
                        .onclick(() => {
                            contentShown.value = !contentShown.value;
                        }).text(comment.content)
                        .build())
                ).build();
        } else {
            return create("span")
                .classes("text", "comment_content", "text-small", "fullWidth")
                .text(comment.content)
                .build();
        }
    }

    static commentButton(showButton: boolean, comments: Signal<Comment[]>, showComments: Signal<boolean> = signal(false)) {
        const count = compute(c => c.length ? c.length.toString() : "0", comments);

        return create("div")
            .children(
                when(showButton, button({
                    text: count,
                    classes: ["wide-round-button"],
                    icon: {
                        icon: "comment",
                        adaptive: true,
                        classes: ["inline-icon", "svg", "nopointer"],
                    },
                    onclick: () => showComments.value = !showComments.value
                }))
            ).build();
    }
}