import {GenericTemplates} from "./GenericTemplates.ts";
import {Icons} from "../Enums/Icons.js";
import {CommentActions} from "../Actions/CommentActions.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";
import {AnyElement, create, ifjs, signalMap} from "../../fjsc/src/f2.ts";
import {User} from "../Models/DbModels/lyda/User.ts";
import {Comment} from "../Models/DbModels/lyda/Comment.ts";
import {FJSC} from "../../fjsc";
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {UserWidgetContext} from "../Enums/UserWidgetContext.ts";
import {InputType} from "../../fjsc/src/Types.ts";

export class CommentTemplates {
    static moderatableComment(comment: any, comments: Signal<Comment[]>, user: User) {
        const id = comment.comment.id;

        const el = create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("card")
                    .children(
                        CommentTemplates.commentInList(comment, comments),
                    ).build(),
                create("div")
                    .classes("flex-v")
                    .children(
                        GenericTemplates.action(Icons.CHECK, "Approve", "approveComment", async () => {
                            const success = await CommentActions.markSafe(id);
                            if (success) {
                                el.remove();
                            }
                        }, [], ["positive"]),
                        GenericTemplates.action(Icons.X, "Hide", "hideComment", async () => {
                            const success = await CommentActions.hideComment(id);
                            if (success) {
                                el.remove();
                            }
                        }, [], ["negative"]),
                    ).build()
            ).build();

        return el;
    }

    static async moderatableCommentsList(comments: any[], user: User) {
        const commentList = comments.map(c => CommentTemplates.moderatableComment(c, signal(comments), user));

        return create("div")
            .classes("flex-v")
            .children(...commentList)
            .build();
    }

    static commentListFullWidth(track_id: number, comments: Signal<Comment[]>, showComments: Signal<boolean>) {
        const hasComments = compute(c => c.length > 0, comments);
        const nestedComments = compute(c => Util.nestComments(c), comments);

        return create("div")
            .classes("listFromStatsIndicator", "move-to-new-row", "comments", "flex-v")
            .children(
                ifjs(showComments, create("div")
                    .classes("flex-v")
                    .children(
                        CommentTemplates.commentBox(track_id, comments),
                        ifjs(hasComments, create("span")
                            .classes("text", "no-comments")
                            .text("No comments yet")
                            .build(), true),
                        ifjs(hasComments, signalMap(nestedComments, create("div").classes("flex-v", "comment-list"), (comment: Comment) => CommentTemplates.commentInList(comment, comments)))
                    ).build()),
            ).build();
    }

    static commentBox(track_id: number, comments: Signal<Comment[]>) {
        const newComment = signal("");

        return create("div")
            .classes("comment-box", "flex-v")
            .children(
                ifjs(Util.isLoggedIn(), create("div")
                    .classes("comment-box-input-container", "flex-v", "fullWidth", "card", "secondary")
                    .children(
                        FJSC.textarea({
                            classes: ["comment-box-input"],
                            name: "comment-box-input",
                            placeholder: "New comment...",
                            value: newComment,
                            attributes: ["track_id", track_id.toString()],
                            onchange: v => newComment.value = v,
                        }),
                        FJSC.button({
                            text: "Post",
                            icon: { icon: "send" },
                            classes: ["positive"],
                            onclick: () => TrackActions.newComment(newComment, comments, track_id)
                        }),
                    ).build())
            ).build();
    }

    static commentInList(comment: Comment, comments: Signal<Comment[]>): AnyElement {
        let actions = [];
        if (!comment.user) {
            throw new Error(`Comment ${comment.id} has no user`);
        }
        if (comment.canEdit) {
            actions.push(FJSC.button({
                text: "Delete",
                icon: { icon: "delete" },
                classes: ["negative"],
                onclick: () => TrackActions.deleteComment(comment.id)
            }));
        }
        const avatarState = signal(Images.DEFAULT_AVATAR);
        if (comment.user.has_avatar) {
            Util.getUserAvatar(comment.user_id).then(avatar => {
                avatarState.value = avatar;
            });
        }
        const replyInputShown = signal(false);
        const newComment = signal("");

        return create("div")
            .classes("comment-in-list", "flex-v")
            .id(comment.id)
            .attributes("parent_id", comment.parent_id)
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        UserTemplates.userWidget(comment.user, Util.arrayPropertyMatchesUser(comment.user.follows ?? [], "following_user_id"), ["comment_id", comment.id], [], UserWidgetContext.comment),
                        create("span")
                            .classes("text", "text-small", "color-dim", "align-center")
                            .text(Time.agoUpdating(new Date(comment.created_at)))
                            .build(),
                        create("div")
                            .classes("flex")
                            .children(...actions)
                            .build()
                    ).build(),
                create("div")
                    .classes("flex", "comment_body")
                    .children(
                        CommentTemplates.commentContent(comment, true),
                        ifjs(Util.isLoggedIn(), create("div")
                            .classes("flex")
                            .children(
                                FJSC.button({
                                    text: "Reply",
                                    icon: { icon: "reply" },
                                    classes: ["positive"],
                                    onclick: () => replyInputShown.value = !replyInputShown.value
                                }),
                                ifjs(replyInputShown, FJSC.input<string>({
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
                                ifjs(replyInputShown, FJSC.button({
                                    text: "Post",
                                    icon: { icon: "send" },
                                    classes: ["positive"],
                                    onclick: () => TrackActions.newComment(newComment, comments, comment.track_id, comment.id)
                                }))
                            ).build()),
                    ).build(),
                create("div")
                    .classes("comment-children")
                    .children(...(comment.comments?.map(c => CommentTemplates.commentInList(c, comments)) ?? []))
                    .build()
            ).build();
    }

    static commentContent(comment: Comment, fullWidth = false) {
        if (comment.hidden) {
            return create("div")
                .classes("flex", "hoverable", "hidden-comment", "rounded", "padded")
                .children(
                    create("img")
                        .classes("inline-icon")
                        .src(Icons.WARNING)
                        .build(),
                    create("i")
                        .classes("text", "comment_content", "text-small")
                        .text(comment.content)
                        .build()
                ).build();
        } else {
            return create("span")
                .classes("text", "comment_content", "text-small", fullWidth ? "fullWidth" : "")
                .text(comment.content)
                .build();
        }
    }

    static commentButton(showButton: boolean, comments: Signal<Comment[]>, showComments: Signal<boolean> = signal(false)) {
        const count = compute(c => c.length.toString(), comments);

        return create("div")
            .children(
                ifjs(showButton, FJSC.button({
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