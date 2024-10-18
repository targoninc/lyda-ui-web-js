import {create, signal} from "https://fjs.targoninc.com/f.js";
import {StatisticsTemplates} from "./StatisticsTemplates.mjs";
import {GenericTemplates} from "./GenericTemplates.ts";
import {Icons} from "../Enums/Icons.js";
import {CommentActions} from "../Actions/CommentActions.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";

export class CommentTemplates {
    static moderatableComment(comment, user) {
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
                            const success = CommentActions.hideComment(id);
                            if (success) {
                                el.remove();
                            }
                        }, [], ["negative"]),
                    ).build()
            ).build();

        return el;
    }

    static async moderatableCommentsList(comments, user) {
        const commentList = comments.map(c => CommentTemplates.moderatableComment(c, user));

        return create("div")
            .classes("flex-v")
            .children(
                commentList
            ).build();
    }

    static commentListFullWidth(track_id, comments, user) {
        let commentList;
        if (comments.length > 0) {
            const actualComments = comments.map(comment => CommentTemplates.commentInList(comment, user));

            commentList = create("div")
                .classes("flex-v", "comment-list")
                .children(
                    ...actualComments
                )
                .build();
        } else {
            commentList =
                create("span")
                    .classes("text", "no-comments")
                    .text("No comments yet")
                    .build();
        }

        Util.nestCommentElementsByParents();

        return create("div")
            .classes("listFromStatsIndicator", "move-to-new-row", "comments", "flex-v", "hidden")
            .children(
                create("span")
                    .classes("comments-label", "text", "label", "padded-inline", "rounded", "text-small")
                    .text("Comments")
                    .build(),
                CommentTemplates.commentBox(track_id),
                commentList
            )
            .build();
    }

    static commentBox(track_id) {
        return create("div")
            .classes("comment-box", "flex-v")
            .children(
                Util.isLoggedIn() ? create("div")
                    .classes("comment-box-input-container", "flex", "fullWidth")
                    .children(
                        create("input")
                            .classes("comment-box-input", "flex", "fullWidth", "shadow")
                            .type("text")
                            .attributes("placeholder", "New comment...", "track_id", track_id)
                            .onkeydown(TrackActions.newCommentFromElement)
                            .build()
                    ).build() : null
            ).build();
    }

    static commentsIndicator(track_id, comment_count) {
        const toggleState = signal(false);
        return StatisticsTemplates.statsIndicator("comments", toggleState, comment_count, "Comment", Icons.COMMENT, track_id);
    }

    static commentListOpener(track_id, comments, user) {
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

        return create("div")
            .classes("listFromStatsOpener", "comments", "flex", "relative")
            .children(
                create("span")
                    .classes("stats-indicator-opener", "clickable", "rounded", "padded-inline")
                    .children(
                        create("img")
                            .classes("inline-icon", "svg", "nopointer")
                            .src(Icons.DROPDOWN)
                            .build(),
                    )
                    .onclick(e => {
                        Util.toggleClass(e.target.parentElement.querySelector(".listFromStatsIndicator"), "hidden", "listFromStatsIndicator");

                        document.addEventListener("click", Util.hideElementIfCondition.bind(null, e => {
                            return !(e.target.parentElement.classList.contains("comments")
                                || e.target.classList.contains("comments"));
                        }, "listFromStatsIndicator.comments"), {once: true});
                    })
                    .build(),
                create("div")
                    .classes("listFromStatsIndicator", "popout-below", "comments", "shadow", "flex-v", "hidden", "padded", "rounded")
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
                    )
                    .build()
            )
            .build();
    }

    static commentInList(commentData, user) {
        let actions = [];
        const comment = commentData.comment;
        const canEdit = commentData.canEdit;
        if (canEdit) {
            const deleteAction = GenericTemplates.inlineAction("Delete", Icons.DELETE, "delete-comment", comment.id, TrackActions.deleteCommentFromElement);
            actions.push(deleteAction);
        }
        const avatarState = signal(Images.DEFAULT_AVATAR);
        Util.getAvatarFromUserIdAsync(comment.userId).then(avatar => {
            avatarState.value = avatar;
        });

        return create("div")
            .classes("comment-in-list", "flex-v")
            .id(comment.id)
            .attributes("parent_id", comment.parentId)
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        UserTemplates.userWidget(comment.userId, comment.user.username, comment.user.displayname, avatarState,
                            Util.arrayPropertyMatchesUser(comment.user.follows, "followingUserId", user), ["comment_id", comment.id]),
                        create("span")
                            .classes("text", "text-small", "color-dim", "align-center")
                            .text(Time.ago(comment.createdAt))
                            .build(),
                        create("div")
                            .classes("flex")
                            .children(...actions)
                            .build()
                    )
                    .build(),
                create("div")
                    .classes("flex", "comment_body")
                    .children(
                        CommentTemplates.commentContent(comment, true),
                        Util.isLoggedIn() ? GenericTemplates.inlineAction("Reply", Icons.REPLY, "Reply", comment.id, TrackActions.replyToComment, ["track_id", comment.trackId], ["secondary"]) : null,
                    ).build(),
                create("div")
                    .classes("comment-children")
                    .build()
            )
            .build();
    }

    static commentContent(comment, fullWidth = false) {
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
                        create("img")
                            .classes("inline-icon", "svg", "nopointer")
                            .src(Icons.DROPDOWN)
                            .build(),
                    )
                    .onclick(() => {
                        Util.toggleClass(document.querySelector(".listFromStatsIndicator.comments"), "hidden", "listFromStatsIndicator");
                    })
                    .build()
            )
            .build();
    }
}