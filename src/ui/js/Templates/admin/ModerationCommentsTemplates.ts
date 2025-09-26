import { DashboardTemplates } from "./DashboardTemplates.ts";
import { CommentTemplates } from "../CommentTemplates.ts";
import { AnyElement, compute, create, InputType, Signal, signal, when } from "@targoninc/jess";
import { TrackActions } from "../../Actions/TrackActions.ts";
import { GenericTemplates } from "../generic/GenericTemplates.ts";
import { button, input, toggle } from "@targoninc/jess-components";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { Comment } from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import { Api } from "../../Api/Api.ts";
import { ModerationFilter } from "../../Models/ModerationFilter.ts";
import { t } from "../../../locales";

export class ModerationCommentsTemplates {
    static commentModerationPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canDeleteComments],
            ModerationCommentsTemplates.commentListWithFilter()
        );
    }

    static commentListWithFilter() {
        const commentsList = signal<AnyElement>(create("div").build());
        const filterState = signal<ModerationFilter>({
            potentiallyHarmful: true,
            user_id: null,
            offset: 0,
            limit: 100
        });
        const loading = signal(false);

        const update = async (newFilter: ModerationFilter) => {
            commentsList.value = create("div").build();
            const comments = await Api.getModerationComments(newFilter, loading);
            if (comments) {
                commentsList.value = ModerationCommentsTemplates.moderatableCommentsList(comments);
            }
        }

        filterState.subscribe(update);
        update(filterState.value).then();

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "align-children", "fixed-bar")
                    .children(
                        ModerationCommentsTemplates.commentFilters(filterState),
                        button({
                            text: t("REFRESH"),
                            icon: { icon: "refresh" },
                            classes: ["positive"],
                            onclick: async () => {
                                await update(filterState.value);
                            }
                        })
                    ).build(),
                when(loading, GenericTemplates.loadingSpinner()),
                commentsList
            ).build();
    }

    static commentFilters(filter: Signal<any>) {
        const potentiallyHarmful = compute(f => f.potentiallyHarmful, filter);
        const userId = compute(f => f.user_id, filter);
        const offset = compute(f => f.offset, filter);
        const limit = compute(f => f.limit, filter);
        // TODO: Implement

        return create("div")
            .classes("flex", "align-children")
            .children(
                toggle({
                    text: t("POTENTIALLY_HARMFUL"),
                    checked: potentiallyHarmful,
                    onchange: (v) => {
                        filter.value = { ...filter.value, potentiallyHarmful: v };
                    }
                }),
                create("div")
                    .classes("flex")
                    .children(
                        input<number>({
                            type: InputType.number,
                            name: "user_id",
                            placeholder: t("FILTER_BY_USER_ID"),
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
            .children(...comments.map(c => ModerationCommentsTemplates.moderatableComment(c, signal(comments)))).build();
    }

    static moderatableComment(comment: Comment, comments: Signal<Comment[]>) {
        return create("div")
            .classes("flex-v", "comment-in-list")
            .id(comment.id)
            .children(
                create("div")
                    .classes("flex", "align-children")
                    .children(
                        button({
                            text: "Open track",
                            icon: { icon: "open_in_new" },
                            classes: ["positive"],
                            onclick: async () => {
                                window.open(window.location.origin + "/track/" + comment.track_id);
                            }
                        }),
                        button({
                            text: "Delete comment",
                            icon: { icon: "delete" },
                            classes: ["negative"],
                            onclick: async () => {
                                await TrackActions.deleteComment(comment.id, comments);
                            }
                        }),
                        toggle({
                            text: "Potentially harmful",
                            checked: comment.potentially_harmful,
                            onchange: async (v) => {
                                await Api.setPotentiallyHarmful(comment.id, v);
                                comments.value = comments.value.map(c => {
                                    if (c.id === comment.id) {
                                        c.potentially_harmful = v;
                                    }
                                    return c;
                                });
                            }
                        }),
                        toggle({
                            text: "Hidden",
                            checked: comment.hidden,
                            onchange: async (v) => {
                                await Api.setHidden(comment.id, v);
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