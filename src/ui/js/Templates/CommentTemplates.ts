import {StatisticsTemplates} from "./StatisticsTemplates.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {Icons} from "../Enums/Icons.js";
import {CommentActions} from "../Actions/CommentActions.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";
import {create, ifjs, signalMap} from "../../fjsc/src/f2.ts";
import {User} from "../Models/DbModels/User.ts";
import {Comment} from "../Models/DbModels/Comment.ts";
import {FJSC} from "../../fjsc";
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";

;

export class CommentTemplates {
    static moderatableComment(comment: any, user: User) {
        const id = comment.comment.id;
        const parentCommentId = signal(0);

        const el = create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("card")
                    .children(
                        CommentTemplates.commentInList(comment, parentCommentId, user),
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
        const commentList = comments.map(c => CommentTemplates.moderatableComment(c, user));

        return create("div")
            .classes("flex-v")
            .children(...commentList)
            .build();
    }

    static commentListFullWidth(track_id: number, initial_comments: Comment[], user: User) {
        const comments = signal(initial_comments);
        const hasComments = compute(c => c.length > 0, comments);
        hasComments.subscribe(() => {
            Util.nestCommentElementsByParents();
        });
        setTimeout(() => {
            Util.nestCommentElementsByParents();
        });
        const parentCommentId = signal(0);

        return create("div")
            .classes("listFromStatsIndicator", "move-to-new-row", "comments", "flex-v", "hidden")
            .children(
                GenericTemplates.cardLabel("Comments", "comment"),
                CommentTemplates.commentBox(track_id, parentCommentId, comments),
                ifjs(hasComments, create("span")
                    .classes("text", "no-comments")
                    .text("No comments yet")
                    .build(), true),
                ifjs(hasComments, signalMap(comments, create("div").classes("flex-v", "comment-list"), (comment: Comment) => CommentTemplates.commentInList(comment, parentCommentId, user)))
            ).build();
    }

    static commentBox(track_id: number, parentCommentId: Signal<number>, comments: Signal<Comment[]>) {
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
                            onclick: () => TrackActions.newComment(newComment, comments, track_id, parentCommentId)
                        }),
                    ).build())
            ).build();
    }

    static commentsIndicator(track_id: number, comment_count: number) {
        const toggleState = signal(false);
        return StatisticsTemplates.statsIndicator("comments", toggleState, comment_count, "comment", track_id);
    }

    static commentListOpener(track_id: number, initial_comments: Comment[], user: User) {
        const parentCommentId = signal(0);
        const comments = signal(initial_comments);
        const hasComments = compute((c: Comment[]) => c.length > 0, comments);
        hasComments.subscribe(() => {
            Util.nestCommentElementsByParents();
        });
        setTimeout(() => {
            Util.nestCommentElementsByParents();
        });
        const listShown = signal(false);

        return create("div")
            .classes("listFromStatsOpener", "comments", "flex", "relative")
            .children(
                create("span")
                    .classes("stats-indicator-opener", "clickable", "rounded", "padded-inline")
                    .onclick(() => {
                        listShown.value = !listShown.value;
                    })
                    .children(
                        FJSC.icon({
                            icon: "arrow_drop_down",
                            adaptive: true,
                            classes: ["inline-icon", "svg", "nopointer"],
                        }),
                    ).build(),
                ifjs(listShown, create("div")
                    .classes("listFromStatsIndicator", "popout-below", "comments", "flex-v", "padded", "rounded")
                    .children(
                        create("span")
                            .classes("comments-label", "text", "label", "padded-inline", "rounded", "text-small")
                            .text("Comments")
                            .build(),
                        CommentTemplates.commentBox(track_id, parentCommentId, comments),
                        create("div")
                            .classes("flex-v", "comment-list")
                            .children(
                                ifjs(hasComments, create("span")
                                    .classes("text", "no-comments")
                                    .text("No comments yet")
                                    .build(), true),
                                ifjs(hasComments, signalMap(comments, create("div").classes("flex-v", "comment-list"), (comment: Comment) => CommentTemplates.commentInList(comment, parentCommentId, user)))
                            ).build(),
                    ).build())
            ).build();
    }

    static commentInList(comment: Comment, parentCommentId: Signal<number>, user: User) {
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
        if (user.has_avatar) {
            Util.getAvatarFromUserIdAsync(comment.user_id).then(avatar => {
                avatarState.value = avatar;
            });
        }

        return create("div")
            .classes("comment-in-list", "flex-v")
            .id(comment.id)
            .attributes("parent_id", comment.parent_id)
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        UserTemplates.userWidget(comment.user, Util.arrayPropertyMatchesUser(comment.user.follows, "following_user_id", user), ["comment_id", comment.id]),
                        create("span")
                            .classes("text", "text-small", "color-dim", "align-center")
                            .text(Time.ago(comment.created_at))
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
                        Util.isLoggedIn() ? GenericTemplates.inlineAction("Reply", "prompt_suggestion", comment.id, (e: Event) => TrackActions.replyToComment(e, comment.track_id, comment.id, comment.user!.username, parentCommentId), ["track_id", comment.track_id], ["secondary"]) : null,
                    ).build(),
                create("div")
                    .classes("comment-children")
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

    static commentListSingleOpener() {
        return create("div")
            .classes("listFromStatsOpener", "comments", "flex", "relative")
            .children(
                create("span")
                    .classes("stats-indicator-opener", "clickable", "rounded", "padded-inline")
                    .children(
                        FJSC.icon({
                            icon: "arrow_drop_down",
                            adaptive: true,
                            classes: ["inline-icon", "svg", "nopointer"],
                        }),
                    ).onclick(() => {
                    Util.toggleClass(document.querySelector(".listFromStatsIndicator.comments"), "hidden", "listFromStatsIndicator");
                }).build()
            ).build();
    }
}