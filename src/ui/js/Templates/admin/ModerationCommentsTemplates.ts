import {DashboardTemplates} from "./DashboardTemplates.ts";
import {Permissions} from "../../Enums/Permissions.ts";
import {CommentTemplates} from "../CommentTemplates.ts";
import {Comment} from "../../Models/DbModels/lyda/Comment.ts";
import {compute, signal, Signal} from "../../../fjsc/src/signals.ts";
import {AnyElement, create, ifjs} from "../../../fjsc/src/f2.ts";
import {FJSC} from "../../../fjsc";
import {TrackActions} from "../../Actions/TrackActions.ts";
import {CommentActions} from "../../Actions/CommentActions.ts";
import {GenericTemplates} from "../GenericTemplates.ts";
import {InputType} from "../../../fjsc/src/Types.ts";

export class ModerationCommentsTemplates {
    static commentModerationPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canDeleteComments],
            ModerationCommentsTemplates.commentListWithFilter()
        );
    }

    static commentListWithFilter() {
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
                commentsList.value = ModerationCommentsTemplates.moderatableCommentsList(comments);
            });
        });
        CommentActions.getModerationComments(filterState.value, loading, async (comments: Comment[]) => {
            commentsList.value = ModerationCommentsTemplates.moderatableCommentsList(comments);
        });

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "align-children", "fixed-bar")
                    .children(
                        ModerationCommentsTemplates.commentFilters(filterState),
                        FJSC.button({
                            text: "Refresh",
                            icon: { icon: "refresh" },
                            classes: ["positive"],
                            onclick: async () => {
                                commentsList.value = create("div").build();
                                CommentActions.getModerationComments(filterState.value, loading, async (comments: Comment[]) => {
                                    commentsList.value = ModerationCommentsTemplates.moderatableCommentsList(comments);
                                });
                            }
                        })
                    ).build(),
                ifjs(loading, GenericTemplates.loadingSpinner()),
                commentsList
            ).build();
    }

    static commentFilters(filter: Signal<any>) {
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
                            onchange: (v: number|null) => {
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
            .children(...comments.map(c => ModerationCommentsTemplates.moderatableComment(c, signal(comments))))
            .build();
    }

    static moderatableComment(comment: Comment, comments: Signal<Comment[]>) {
        return create("div")
            .classes("flex-v", "comment-in-list")
            .id(comment.id)
            .children(
                create("div")
                    .classes("flex", "align-children")
                    .children(
                        FJSC.button({
                            text: "Open track",
                            icon: { icon: "open_in_new" },
                            classes: ["positive"],
                            onclick: async () => {
                                window.open(window.location.origin + "/track/" + comment.track_id);
                            }
                        }),
                        FJSC.button({
                            text: "Delete comment",
                            icon: { icon: "delete" },
                            classes: ["negative"],
                            onclick: async () => {
                                await TrackActions.deleteComment(comment.id, comments);
                            }
                        }),
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
                    ).build(),
                create("div")
                    .classes("card")
                    .children(
                        CommentTemplates.commentInList(comment, comments),
                    ).build(),
            ).build();
    }
}