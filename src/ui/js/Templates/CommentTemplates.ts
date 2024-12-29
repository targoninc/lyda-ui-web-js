import {GenericTemplates} from "./GenericTemplates.ts";
import {Icons} from "../Enums/Icons.js";
import {CommentActions} from "../Actions/CommentActions.ts";
import {TrackActions} from "../Actions/TrackActions.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {Images} from "../Enums/Images.ts";
import {Util} from "../Classes/Util.ts";
import {AnyElement, create, ifjs, signalMap} from "../../fjsc/src/f2.ts";
import {Comment} from "../Models/DbModels/lyda/Comment.ts";
import {FJSC} from "../../fjsc";
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {UserWidgetContext} from "../Enums/UserWidgetContext.ts";
import {InputType} from "../../fjsc/src/Types.ts";

export class CommentTemplates {
    static moderatableComment(comment: Comment, comments: Signal<Comment[]>) {
        return create("div")
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
                        FJSC.toggle({
                            text: "Potentially harmful",
                            checked: comment.potentially_harmful,
                            onchange: async (v) => {
                                await CommentActions.setPotentiallyHarmful(comment.id, v);
                                comments.value = comments.value.map(c => {
                                    if (c.id === comment.id) {
                                        c.potentially_harmful = v;
                                    }
                                    return c;
                                });
                            }
                        }),
                        FJSC.toggle({
                            text: "Hidden",
                            checked: comment.hidden,
                            onchange: async (v) => {
                                await CommentActions.setHidden(comment.id, v);
                                comments.value = comments.value.map(c => {
                                    if (c.id === comment.id) {
                                        c.hidden = v;
                                    }
                                    return c;
                                });
                            }
                        }),
                    ).build()
            ).build();
    }

    static async moderatableCommentsPage() {
        const commentsList = signal<AnyElement>(create("div").build());
        const filterState = signal({
            potentiallyHarmful: true,
            user_id: null,
            offset: 0,
            limit: 100
        });
        const loading = signal(false);
        filterState.subscribe(async (newFilter) => {
            commentsList.value = create("div").build();
            CommentActions.getModerationComments(newFilter, loading, async (comments: Comment[]) => {
                commentsList.value = CommentTemplates.moderatableCommentsList(comments);
            });
        });
        CommentActions.getModerationComments(filterState.value, loading, async (comments: Comment[]) => {
            commentsList.value = CommentTemplates.moderatableCommentsList(comments);
        });

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "align-children", "fixed-bar")
                    .children(
                        CommentTemplates.commentFilters(filterState),
                        FJSC.button({
                            text: "Refresh",
                            icon: { icon: "refresh" },
                            classes: ["positive"],
                            onclick: async () => {
                                commentsList.value = create("div").build();
                                CommentActions.getModerationComments(filterState.value, loading, async (comments: Comment[]) => {
                                    commentsList.value = CommentTemplates.moderatableCommentsList(comments);
                                });
                            }
                        })
                    ).build(),
                ifjs(loading, GenericTemplates.loadingSpinner()),
                commentsList
            ).build();
    }

    static commentFilters(filter: Signal<{ potentiallyHarmful: boolean, user_id: number | null, offset: number, limit: number }>) {
        const potentiallyHarmful = compute(f => f.potentiallyHarmful, filter);
        const userId = compute(f => f.user_id, filter);
        const offset = compute(f => f.offset, filter);
        const limit = compute(f => f.limit, filter);

        return create("div")
            .classes("flex", "align-children")
            .children(
                FJSC.toggle({
                    text: "Potentially harmful",
                    checked: potentiallyHarmful,
                    onchange: (v) => {
                        filter.value = { ...filter.value, potentiallyHarmful: v };
                    }
                }),
                create("div")
                    .classes("flex")
                    .children(
                        FJSC.input<number>({
                            type: InputType.number,
                            name: "user_id",
                            placeholder: "Filter by user ID",
                            value: userId,
                            onchange: (v) => {
                                if (v === 0) {
                                    v = null;
                                }
                                filter.value = { ...filter.value, user_id: v };
                            }
                        }),
                    ).build(),
            ).build();
    }

    static moderatableCommentsList(comments: Comment[]) {
        if (comments.length === 0) {
            return create("div")
                .classes("card", "flex-v")
                .children(
                    create("span")
                        .text("No comments")
                        .build()
                ).build();
        }

        return create("div")
            .classes("flex-v", "fixed-bar-content")
            .children(...comments.map(c => CommentTemplates.moderatableComment(c, signal(comments))))
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
                onclick: () => TrackActions.deleteComment(comment.id, comments)
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
                        CommentTemplates.commentContent(comment),
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

    static commentContent(comment: Comment) {
        if (comment.hidden) {
            const contentShown = signal(false);

            return create("div")
                .classes("text", "comment_content", "text-small", "flex", "noflexwrap", "fullWidth")
                .children(
                    ifjs(contentShown, create("div")
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
                    ifjs(contentShown, create("span")
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