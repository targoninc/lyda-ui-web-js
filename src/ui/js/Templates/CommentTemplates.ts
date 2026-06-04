import { GenericTemplates, horizontal, vertical } from "./generic/GenericTemplates.ts";
import { PopoverTemplates } from "./generic/PopoverTemplates.ts";
import { Icons } from "../Enums/Icons.ts";
import { TrackActions } from "../Actions/TrackActions.ts";
import { UserTemplates } from "./account/UserTemplates.ts";
import { Images } from "../Enums/Images.ts";
import { Util } from "../Classes/Util.ts";
import { AnyElement, compute, create, InputType, Signal, signal, signalMap, when } from "@targoninc/jess";
import { button, input, textarea } from "@targoninc/jess-components";
import { Comment } from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import { UserWidgetContext } from "../Enums/UserWidgetContext.ts";
import { t } from "../../locales";
import {permissions, currentUser, currentTrackId, currentTrackPosition, trackInfo} from "../state.ts";
import {Permissions} from "@targoninc/lyda-shared/src/Enums/Permissions";
import {RoutePath} from "../Routing/routes.ts";
import {navigate} from "../Routing/Router.ts";
import {InteractionTemplates} from "./InteractionTemplates.ts";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType";
import {PlayManager} from "../Streaming/PlayManager.ts";

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
                            .text(t("NO_COMMENTS"))
                            .build(), true),
                        when(hasComments, signalMap(nestedComments, create("div").classes("flex-v", "comment-list"),
                            (comment: Comment) => CommentTemplates.commentInList(comment, comments))),
                        CommentTemplates.commentBox(track_id, comments),
                    ).build()),
            ).build();
    }

    static timestamp(trackId: number, totalSeconds: number, trackLength: number, display: string) {
        return create("a")
            .classes("text").classes("inlineLink")
            .text(display)
            .onclick(async (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (currentTrackId.value !== trackId) {
                    await PlayManager.startAsync(trackId);
                }
                await PlayManager.scrubTo(trackId, totalSeconds / trackLength);
            })
            .build();
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
                            placeholder: t("NEW_COMMENT"),
                            value: newComment,
                            attributes: ["track_id", track_id.toString()],
                            onchange: v => newComment.value = v,
                        }),
                        button({
                            text: t("POST"),
                            icon: { icon: "send" },
                            classes: ["positive"],
                            onclick: () => TrackActions.newComment(newComment, comments, track_id),
                        }),
                    ).on("focusin", (e: FocusEvent) => {
                        if (newComment.value !== "" || currentTrackId.value !== track_id) {
                            return;
                        }

                        const pos = currentTrackPosition.value.absolute;
                        if (pos <= 0) {
                            return;
                        }
                        const mins = Math.floor(pos / 60);
                        const secs = Math.floor(pos % 60);
                        newComment.value = `${mins}:${secs.toString().padStart(2, "0")} `;
                    }).on("keydown", (e: KeyboardEvent) => {
                        if (e.ctrlKey && e.key === "Enter") {
                            TrackActions.newComment(newComment, comments, track_id);
                        }
                    }).build()),
            ).build();
    }

    static commentInList(comment: Comment, comments: Signal<Comment[]>, isInModeration = false): AnyElement {
        if (!comment.user) {
            throw new Error(`Comment ${comment.id} has no user`);
        }
        const avatarState = signal(Images.DEFAULT_AVATAR);
        if (comment.user.has_avatar) {
            Util.getCachedUserAvatar(comment.user_id).then(url => {
                avatarState.value = url;
            });
        }
        const replyInputShown = signal(false);
        const repliesShown = signal(false);
        const newComment = signal("");
        const canModerate = compute(ps => ps.some(p => p.name === Permissions.canDeleteComments), permissions);
        const deleteBtn = button({
            text: t("DELETE"),
            icon: { icon: "delete" },
            classes: ["negative"],
            onclick: () => TrackActions.deleteComment(comment.id, comments),
        });
        const deletePopover = PopoverTemplates.manualPopover(`comment-menu-${comment.id}`,
            create("div").classes("flex-v").children(deleteBtn).build(),
        );
        const moreBtn = GenericTemplates.textButton(
            "More",
            () => PopoverTemplates.toggle(deletePopover, moreBtn),
            "more_horiz",
        );

        return create("div")
            .classes("comment-in-list", "flex-v", "small-gap", (comment.parent_id ?? 0) === 0 ? "tight-border-card" : "_")
            .id(comment.id)
            .attributes("parent_id", comment.parent_id)
            .children(
                create("div")
                    .classes("flex-v", "small-gap")
                    .children(
                        vertical(
                            horizontal(
                                UserTemplates.userLink(UserWidgetContext.comment, comment.user),
                                CommentTemplates.commentContent(comment),
                            ),
                            GenericTemplates.timestamp(comment.created_at),
                        ).classes("no-gap"),
                        horizontal(
                            InteractionTemplates.interactions(EntityType.comment, comment, {disabler: compute(u => u?.id === comment.user_id, currentUser)}),
                            when(Util.isLoggedIn(), CommentTemplates.commentReplySection(repliesShown, replyInputShown, comment, newComment, comments)),
                            when(Util.isLoggedIn() && comment.canEdit, horizontal(
                                moreBtn,
                                deletePopover,
                            ).classes("relative").build()),
                            when(canModerate, button({
                                text: t("MODERATION"),
                                icon: { icon: "gavel" },
                                onclick: () => navigate(RoutePath.moderation)
                            })),
                        ).classes("align-children"),
                    ).build(),
                when(repliesShown, create("div")
                    .classes("comment-children", "flex-v")
                    .children(...(comment.comments?.map(c => CommentTemplates.commentInList(c, comments)) ?? []))
                    .build()),
            ).build();
    }

    private static commentReplySection(repliesShown: Signal<boolean>, replyInputShown: Signal<boolean>, comment: Comment, newComment: Signal<string>, comments: Signal<Comment[]>) {
        const len = comment.comments?.length ?? 0;

        return horizontal(
            GenericTemplates.textButton(
                t("REPLY"),
                () => replyInputShown.value = !replyInputShown.value,
                compute((r): string => r ? "close" : "reply", replyInputShown),
            ),
            when(replyInputShown, input<string>({
                type: InputType.text,
                name: "reply-input",
                label: "",
                placeholder: t("REPLY_TO_NAME", comment.user!.username),
                value: newComment,
                attributes: ["track_id", comment.track_id.toString()],
                onchange: v => {
                    newComment.value = v;
                },
                onkeydown: (e: KeyboardEvent) => {
                    if (e.ctrlKey && e.key === "Enter") {
                        TrackActions.newComment(newComment, comments, comment.track_id, comment.id);
                    }
                },
            })),
            when(replyInputShown, button({
                text: t("POST"),
                icon: { icon: "send" },
                classes: ["positive"],
                onclick: () => TrackActions.newComment(newComment, comments, comment.track_id, comment.id),
            })),
            when(len > 0, GenericTemplates.textButton(
                compute((r): string => `${t("REPLIES_SHOWN_HIDDEN", len, r)}`, repliesShown),
                () => repliesShown.value = !repliesShown.value,
                compute((s): string => s ? "visibility" : "visibility_off", repliesShown)),
            ),
        ).build();
    }

    static commentContent(comment: Comment) {
        const trackLength = trackInfo.value[comment.track_id]?.track.length;

        const renderContent = (content: string) => {
            if (!trackLength) {
                return create("span").classes("text", "flex-grow").text(content).build();
            }

            const parts: AnyElement[] = [];
            const regex = /@?(\d+):(\d+)/g;
            let lastIndex = 0;
            let match: RegExpExecArray | null;

            while ((match = regex.exec(content)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(create("span").text(content.slice(lastIndex, match.index)).build());
                }

                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                const totalSeconds = minutes * 60 + seconds;

                if (totalSeconds > 0 && totalSeconds <= trackLength) {
                    parts.push(CommentTemplates.timestamp(
                        comment.track_id,
                        totalSeconds,
                        trackLength,
                        `${minutes}:${seconds.toString().padStart(2, "0")}`,
                    ));
                } else {
                    parts.push(create("span").text(match[0].replace(/^@/, "")).build());
                }

                lastIndex = regex.lastIndex;
            }

            if (lastIndex < content.length) {
                parts.push(create("span").text(content.slice(lastIndex)).build());
            }

            return create("span").classes("text", "flex-grow").children(...parts).build();
        };

        if (comment.hidden) {
            const contentShown = signal(false);

            return create("div")
                .classes("text", "flex", "noflexwrap", "flex-grow")
                .children(
                    when(contentShown, create("div")
                        .classes("color-dim", "flex", "noflexwrap", "fullWidth")
                        .onclick(() => {
                            contentShown.value = !contentShown.value;
                        }).children(
                            GenericTemplates.icon(Icons.WARNING, true),
                            create("i")
                                .classes("text", "fullWidth")
                                .text(t("COMMENT_IS_HIDDEN"))
                                .build(),
                        ).build(), true),
                    when(contentShown, create("span")
                        .onclick(() => {
                            contentShown.value = !contentShown.value;
                        }).text(comment.content)
                        .build()),
                ).build();
        }

        return renderContent(comment.content);
    }
}