import {StatisticsTemplates} from "./StatisticsTemplates.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {Icons} from "../Enums/Icons.js";
import {CommentActions} from "../Actions/CommentActions.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";
import {computedSignal, create, ifjs, signal, signalMap} from "../../fjsc/f2.ts";
import {User} from "../Models/DbModels/User.ts";
import {Comment} from "../Models/DbModels/Comment.ts";
import {FJSC} from "../../fjsc";

export class CommentTemplates {
    static moderatableComment(comment: any, user: User) {
        const id = comment.comment.id;

        const el = create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("card")
                    .children(
                        CommentTemplates.commentInList(comment, user),
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
        const hasComments = computedSignal<boolean>(comments, (c: Comment[]) => c.length > 0);
        hasComments.subscribe(() => {
            Util.nestCommentElementsByParents();
        });
        setTimeout(() => {
            Util.nestCommentElementsByParents();
        });

        return create("div")
            .classes("listFromStatsIndicator", "move-to-new-row", "comments", "flex-v", "hidden")
            .children(
                GenericTemplates.cardLabel("Comments", "comment"),
                CommentTemplates.commentBox(track_id),
                ifjs(hasComments, create("span")
                    .classes("text", "no-comments")
                    .text("No comments yet")
                    .build(), true),
                ifjs(hasComments, signalMap(comments, create("div").classes("flex-v", "comment-list"), (comment: Comment) => CommentTemplates.commentInList(comment, user)))
            ).build();
    }

    static commentBox(track_id: number) {
        return create("div")
            .classes("comment-box", "flex-v")
            .children(
                Util.isLoggedIn() ? create("div")
                    .classes("comment-box-input-container", "flex", "fullWidth")
                    .children(
                        create("input")
                            .classes("comment-box-input", "flex", "fullWidth")
                            .type("text")
                            .attributes("placeholder", "New comment...", "track_id", track_id)
                            .onkeydown(e => TrackActions.newCommentFromElement(e, track_id))
                            .build()
                    ).build() : null
            ).build();
    }

    static commentsIndicator(track_id: number, comment_count: number) {
        const toggleState = signal(false);
        return StatisticsTemplates.statsIndicator("comments", toggleState, comment_count, "comment", track_id);
    }

    static commentListOpener(track_id: number, comments: Comment[], user: User) {
        let commentList;
        if (comments.length > 0) {
            commentList = comments.map(comment => CommentTemplates.commentInList(comment, user));
            Util.nestCommentElementsByParents();
        } else {
            commentList = [create("span")
                .classes("text", "no-comments")
                .text("No comments yet")
                .build()];
        }
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
                        CommentTemplates.commentBox(track_id),
                        create("div")
                            .classes("flex-v", "comment-list")
                            .children(...commentList)
                            .build(),
                    ).build())
            ).build();
    }

    static commentInList(comment: Comment, user: User) {
        let actions = [];
        if (!comment.user) {
            throw new Error(`Comment ${comment.id} has no user`);
        }
        if (comment.canEdit) {
            const deleteAction = GenericTemplates.inlineAction("Delete", "delete", comment.id, () => TrackActions.deleteComment(comment.id));
            actions.push(deleteAction);
        }
        const avatarState = signal(Images.DEFAULT_AVATAR);
        Util.getAvatarFromUserIdAsync(comment.user_id).then(avatar => {
            avatarState.value = avatar;
        });

        return create("div")
            .classes("comment-in-list", "flex-v")
            .id(comment.id)
            .attributes("parent_id", comment.parent_id)
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        UserTemplates.userWidget(comment.user_id, comment.user.username, comment.user.displayname, avatarState,
                            Util.arrayPropertyMatchesUser(comment.user.follows, "followingUserId", user), ["comment_id", comment.id]),
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
                        Util.isLoggedIn() ? GenericTemplates.inlineAction("Reply", "prompt_suggestion", comment.id, TrackActions.replyToComment, ["track_id", comment.track_id], ["secondary"]) : null,
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