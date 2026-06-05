import { DashboardTemplates } from "./DashboardTemplates.ts";
import { CommentTemplates } from "../CommentTemplates.ts";
import { AnyElement, compute, create, InputType, Signal, signal, when } from "@targoninc/jess";
import { TrackActions } from "../../Actions/TrackActions.ts";
import { GenericTemplates, horizontal } from "../generic/GenericTemplates.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { UserWidgetContext } from "../../Enums/UserWidgetContext.ts";
import { button, input, toggle } from "@targoninc/jess-components";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { Comment } from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import { Api } from "../../Api/Api.ts";
import { ModerationFilter } from "../../Models/ModerationFilter.ts";
import { t } from "../../../locales";
import {createModal} from "../../Classes/Ui.ts";

export class ModerationCommentsTemplates {
    static commentModerationPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canDeleteComments],
            ModerationCommentsTemplates.commentListWithFilter(),
        );
    }

    static commentListWithFilter() {
        const commentsList = signal<AnyElement>(create("div").build());
        const filterState = signal<ModerationFilter>({
            potentiallyHarmful: true,
            username: null,
            contentFilter: null,
            offset: 0,
            limit: 10,
            hasReports: false,
        });
        const loading = signal(false);
        const comments = signal<Comment[]>([]);

        const update = async (newFilter: ModerationFilter) => {
            commentsList.value = create("div").build();
            comments.value = (await Api.getModerationComments(newFilter, loading)) ?? [];
            if (comments.value) {
                commentsList.value = ModerationCommentsTemplates.moderatableCommentsList(comments.value);
            }
        };

        filterState.subscribe(update);
        update(filterState.value).then();

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "align-children", "fixed-bar")
                    .children(
                        ModerationCommentsTemplates.commentFilters(filterState, loading, comments),
                        button({
                            text: t("REFRESH"),
                            icon: { icon: "refresh" },
                            classes: ["positive"],
                            onclick: async () => {
                                await update(filterState.value);
                            },
                        }),
                    ).build(),
                when(loading, GenericTemplates.loadingSpinner()),
                commentsList,
            ).build();
    }

    static commentFilters(filter: Signal<any>, loading: Signal<boolean>, results: Signal<Comment[]>, allowFilteringByUser = true) {
        const potentiallyHarmful = compute(f => f.potentiallyHarmful, filter);
        const hasReports = compute(f => f.hasReports, filter);
        const username = compute(f => f.username, filter);
        const contentFilter = compute(f => f.contentFilter, filter);
        const skip = compute(f => f.offset, filter);

        return create("div")
            .classes("flex", "align-children")
            .children(
                toggle({
                    text: t("POTENTIALLY_HARMFUL"),
                    checked: potentiallyHarmful,
                    onchange: (v) => {
                        filter.value = { ...filter.value, potentiallyHarmful: v, hasReports: false };
                    },
                }),
                toggle({
                    text: t("HAS_REPORTS"),
                    checked: hasReports,
                    onchange: (v) => {
                        filter.value = { ...filter.value, hasReports: v, potentiallyHarmful: false };
                    },
                }),
                horizontal(
                    when(allowFilteringByUser, input<string>({
                        type: InputType.text,
                        name: "username",
                        placeholder: t("FILTER_BY_USERNAME"),
                        value: username,
                        onchange: (v: string | null) => {
                            if (v === "") {
                                v = null;
                            }
                            filter.value = { ...filter.value, username: v };
                        },
                    })),
                    input<string>({
                        type: InputType.text,
                        name: "contentFilter",
                        placeholder: t("FILTER_BY_CONTENT"),
                        value: contentFilter,
                        onchange: (v: string | null) => {
                            if (v === "") {
                                v = null;
                            }
                            filter.value = { ...filter.value, contentFilter: v };
                        },
                    }),
                    button({
                        text: t("PREVIOUS_PAGE"),
                        icon: { icon: "skip_previous" },
                        disabled: compute((l, s) => l || s <= 0, loading, skip),
                        onclick: () => {
                            skip.value = Math.max(0, skip.value - 10);
                        },
                    }),
                    button({
                        text: t("NEXT_PAGE"),
                        icon: { icon: "skip_next" },
                        disabled: compute((l, e) => l || e.length < 10, loading, results),
                        onclick: () => {
                            skip.value = skip.value + 10;
                        },
                    }),
                ).build(),
            ).build();
    }

    static moderatableCommentsList(comments: Comment[], hasBar = true) {
        if (comments.length === 0) {
            return create("div")
                .classes("card", "flex-v")
                .children(
                    create("span")
                        .text(t("NO_COMMENTS"))
                        .build(),
                ).build();
        }

        return create("div")
            .classes("flex-v", hasBar ? "fixed-bar-content" : "_")
            .children(...comments.map(c => ModerationCommentsTemplates.moderatableComment(c, signal(comments)))).build();
    }

    static moderatableComment(comment: Comment, comments: Signal<Comment[]>) {
        return create("div")
            .classes("flex-v", "comment-in-list", "card")
            .id(comment.id)
            .children(
                ModerationCommentsTemplates.parentChain(comment),
                create("div")
                    .classes("flex", "align-children")
                    .children(
                        button({
                            text: t("OPEN_TRACK"),
                            icon: { icon: "open_in_new" },
                            classes: ["positive"],
                            onclick: async () => {
                                window.open(window.location.origin + "/track/" + comment.track_id);
                            },
                        }),
                        button({
                            text: t("DELETE_COMMENT"),
                            icon: { icon: "delete" },
                            classes: ["negative"],
                            onclick: async () => {
                                await TrackActions.deleteComment(comment.id, comments);
                            },
                        }),
                        toggle({
                            text: t("POTENTIALLY_HARMFUL"),
                            checked: comment.potentially_harmful,
                            onchange: async (v) => {
                                await Api.setPotentiallyHarmful(comment.id, v);
                                comments.value = comments.value.map(c => {
                                    if (c.id === comment.id) {
                                        c.potentially_harmful = v;
                                    }
                                    return c;
                                });
                            },
                        }),
                        toggle({
                            text: t("HIDDEN"),
                            checked: comment.hidden,
                            onchange: async (v) => {
                                await Api.setHidden(comment.id, v);
                                comments.value = comments.value.map(c => {
                                    if (c.id === comment.id) {
                                        c.hidden = v;
                                    }
                                    return c;
                                });
                            },
                        }),
                        when(comment.report_count && comment.report_count > 0, button({
                            text: t("REPORTS_COUNT", comment.report_count),
                            icon: { icon: "flag" },
                            classes: ["negative"],
                            onclick: () => ModerationCommentsTemplates.showReportsModal(comment),
                        })),
                    ).build(),
                CommentTemplates.commentInList(comment, comments, true),
            ).build();
    }

    private static parentChain(comment: Comment) {
        if (!comment.parent_chain || comment.parent_chain.length === 0) {
            return create("div").build();
        }

        return create("div")
            .classes("flex-v", "small-gap")
            .children(
                ...comment.parent_chain.map(parent => ModerationCommentsTemplates.parentComment(parent)),
            ).build();
    }

    private static parentComment(parent: Comment) {
        if (!parent.user) {
            return create("div").build();
        }

        return create("div")
            .classes("flex-v", "small-gap", "color-dim")
            .children(
                create("div")
                    .classes("flex", "small-gap", "align-children")
                    .children(
                        UserTemplates.userLink(UserWidgetContext.comment, parent.user),
                    ).build(),
                create("div")
                    .classes("text")
                    .text(parent.content)
                    .build(),
                GenericTemplates.timestamp(parent.created_at),
            ).build();
    }

    private static async showReportsModal(comment: Comment) {
        const reports = await Api.getCommentReports(comment.id);
        const modalId = `comment-reports-${comment.id}`;

        createModal([
            create("h2").text(t("REPORTS_FOR_COMMENT")).build(),
            ...reports?.map(r => create("div")
                .classes("card", "flex-v", "small-gap")
                .children(
                    create("span").classes("text", "bold").text(t("REPORT_REASON", r.reason)).build(),
                    create("div")
                        .classes("text")
                        .html(r.description?.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>') ?? "")
                        .build(),
                    create("span").classes("color-dim", "text").text(new Date(r.created_at).toLocaleString()).build(),
                ).build()) ?? [],
            horizontal(
                GenericTemplates.modalCancelButton(null),
            ),
        ].flat(), modalId);
    }
}
