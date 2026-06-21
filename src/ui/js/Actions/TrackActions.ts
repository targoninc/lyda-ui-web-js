import { Util } from "../Classes/Util.ts";
import { Icons } from "../Enums/Icons.ts";
import { PlayManager } from "../Streaming/PlayManager.ts";
import { createModal, notify, Ui } from "../Classes/Ui.ts";
import { navigate } from "../Routing/Router.ts";
import { compute, create, InputType, Signal, signal, when } from "@targoninc/jess";
import { MediaUploader } from "../Api/MediaUploader.ts";
import { RoutePath } from "../Routing/routes.ts";
import { NotificationType } from "../Enums/NotificationType.ts";
import { Comment } from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";
import { ListTrack } from "@targoninc/lyda-shared/src/Models/ListTrack";
import { Playlist } from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { Api } from "../Api/Api.ts";
import { t } from "../../locales";
import { ProgressPart } from "../Models/ProgressPart.ts";
import { ProgressState } from "@targoninc/lyda-shared/src/Enums/ProgressState";
import { button, toggle } from "@targoninc/jess-components";
import { GenericTemplates, horizontal, vertical } from "../Templates/generic/GenericTemplates.ts";

export class TrackActions {
    static async deleteTrack(id: number) {
        if (!confirm) {
            return;
        }
        const success = await Api.deleteTrack(id);
        if (success) {
            await PlayManager.removeTrackFromAllStates(id);
            navigate(RoutePath.profile);
        }
    }

    static async deleteComment(commentId: number, comments: Signal<Comment[]>) {
        await Ui.getConfirmationModal(t("DELETE_COMMENT"), t("SURE_DELETE_COMMENT"), t("YES"), t("NO"), async () => {
            const success = await Api.deleteComment(commentId);

            if (!success) {
                return;
            }

            const commentCount = document.querySelector(".stats-count.comments") as HTMLElement;
            if (commentCount) {
                commentCount.innerText = (parseInt(commentCount.innerText) - 1).toString();
            }
            const comment = document.querySelector(".comment-in-list[id='" + commentId + "']");
            if (comment) {
                comment.remove();
            }
            comments.value = comments.value.filter(c => c.id !== commentId && c.parent_id !== commentId);
            if (document.querySelectorAll(".comment-in-list").length === 0) {
                const noComments = document.querySelector(".no-comments");
                if (noComments !== null) {
                    noComments.classList.remove("hidden");
                }
            }
        }, () => {
        }, Icons.WARNING);
    }

    static async newComment(content: Signal<string>, comments: Signal<Comment[]>, track_id: number, parentCommentId: number | null = null) {
        if (!content.value || content.value === "") {
            return;
        }
        if (content.value.length > 1000) {
            notify(`${t("ERROR_MUST_BE_SHORTER_N", 1000)}`, NotificationType.error);
            return;
        }

        const createdId = await Api.newComment(track_id, content.value, parentCommentId);

        if (createdId === null) {
            return;
        }

        const user = await Util.getUserAsync();

        let nowUtc = new Date();
        const offset = nowUtc.getTimezoneOffset() * 60000;
        nowUtc = new Date(nowUtc.getTime() + offset);

        const comment = <Comment>{
            id: createdId,
            content: content.value,
            user: user,
            user_id: user.id,
            track_id: track_id,
            parent_id: parentCommentId ? parentCommentId : null,
            created_at: nowUtc,
            potentially_harmful: false,
            hidden: false,
            canEdit: true,
            likes: {count: 0, interacted: false},
        };
        comments.value = [...comments.value, comment];
        content.value = "";
    }

    static async toggleFollow(userId: number, following: Signal<boolean>) {
        if (following.value) {
            await Api.unfollowUser(userId);
        } else {
            await Api.followUser(userId);
        }
        following.value = !following.value;
    }

    static replaceAudio(id: number, canEdit: boolean, progress: Signal<ProgressPart | null>, onSuccess: () => void = () => {}, latestVersionIndex?: number, versionCount?: number) {
        if (!canEdit) {
            return;
        }

        const selectedFile = signal<File | null>(null);
        const importing = signal(false);
        const doNotCreateNew = signal(false);
        const nextVersionNum = (versionCount ?? 0) + 1;
        const defaultName = !isNaN(nextVersionNum) ? `v${nextVersionNum}` : "v2";
        const versionName = signal(defaultName);

        const fileInput = create("input")
            .type(InputType.file)
            .styles("display", "none")
            .attributes("accept", "audio/*")
            .build() as HTMLInputElement;

        fileInput.onchange = () => {
            const file = fileInput.files?.[0];
            if (file) {
                selectedFile.value = file;
            }
        };

        const fileName = compute(f => f ? f.name : "", selectedFile);
        const uploadDisabled = compute(
            (f, imp) => !f || imp,
            selectedFile,
            importing,
        );

        const modalContent = vertical(
            create("h3").text(t("REPLACE_AUDIO")).build(),
            GenericTemplates.fileInput("replace-audio-file", "replace-audio-file", "audio/*", t("DROP_AUDIO_FILE_HERE"), false, (_, files) => {
                if (files?.[0]) {
                    selectedFile.value = files[0];
                }
            }),
            create("span").classes("color-dim").text(fileName).build(),
            toggle({
                name: "doNotCreateNewVersion",
                label: t("DO_NOT_CREATE_NEW_VERSION"),
                text: t("DO_NOT_CREATE_NEW_VERSION"),
                checked: doNotCreateNew,
                onchange: v => doNotCreateNew.value = v,
            }),
            when(compute(d => !d, doNotCreateNew), vertical(
                create("label").text(t("VERSION_NAME")).build(),
                create("input").type(InputType.text).value(versionName).onchange((e: Event) => {
                    versionName.value = (e.target as HTMLInputElement).value;
                }).build(),
            ).build()),
            horizontal(
                button({
                    text: t("CANCEL"),
                    icon: {icon: "close"},
                    classes: ["negative"],
                    onclick: () => Util.removeModal(),
                }),
                button({
                    text: t("UPLOAD"),
                    icon: {icon: "upload"},
                    classes: ["positive"],
                    disabled: uploadDisabled,
                    onclick: async () => {
                        const file = selectedFile.value;
                        if (!file) return;

                        importing.value = true;

                        progress.value = {
                            icon: "music_note",
                            text: t("UPLOADING_AUDIO"),
                            state: ProgressState.inProgress,
                            progress: 0,
                        };

                        try {
                            const options: any = {};
                            if (doNotCreateNew.value) {
                                options.versionIndex = latestVersionIndex;
                            } else {
                                options.newVersionName = versionName.value;
                            }

                            await MediaUploader.upload(MediaFileType.audio, id, file, (event: ProgressEvent) => {
                                progress.value = {
                                    ...progress.value!,
                                    progress: (event.loaded / event.total) * 100,
                                };
                            }, options);
                            progress.value = {
                                ...progress.value!,
                                state: ProgressState.complete,
                                text: t("AUDIO_UPLOADED"),
                                progress: 100,
                            };
                            notify(`${t("AUDIO_UPLOADED")}`, NotificationType.success);
                            Util.removeModal();
                            onSuccess();
                        } catch {
                            progress.value = {
                                ...progress.value!,
                                state: ProgressState.error,
                                text: t("FAILED_UPLOADING_AUDIO"),
                                icon: "error",
                            };
                            notify(`${t("FAILED_UPLOADING_AUDIO")}`, NotificationType.error);
                            importing.value = false;
                        }
                    },
                }),
            ).classes("align-end").build(),
        );

        createModal([modalContent], "replace-audio");
    }

    static moveTrackToPosition(idToMove: number, targetPosition: number, tracks: Signal<ListTrack[]>) {
        // Extract the current list of tracks
        const currentTracks = tracks.value;

        // Find the index of the track to move
        const indexToMove = currentTracks.findIndex(track => track.track_id === idToMove);
        if (indexToMove === -1) {
            throw new Error("Track to move not found");
        }

        // Clamp the targetPosition to be within bounds
        const clampedTargetPosition = Math.max(0, Math.min(targetPosition, currentTracks.length - 1));

        // Extract the track to move
        const [trackToMove] = currentTracks.splice(indexToMove, 1);

        // Insert the track at the target position
        currentTracks.splice(clampedTargetPosition, 0, trackToMove);

        // Update the position property of all tracks
        tracks.value = currentTracks.map((track, index) => ({
            ...track,
            position: index,
        }));
    }

    static async removeTrackFromList(tracks: Signal<ListTrack[]>, list: Playlist | Album, type: string, track: ListTrack) {
        await Ui.getConfirmationModal(t("REMOVE_TRACK"), t("SURE_REMOVE_TRACK_FROM", list.title), t("YES"), t("NO"), async () => {
            let success;
            if (type === "album") {
                success = await Api.removeTrackFromAlbums(track.track_id, [list.id]);
            } else {
                success = await Api.removeTrackFromPlaylists(track.track_id, [list.id]);
            }
            if (success) {
                tracks.value = tracks.value.filter(t => t.track_id !== track.track_id);
            }
        }, () => {
        }, Icons.WARNING);
    }

    static async reorderTrack(type: string, listId: number, trackId: number, tracks: Signal<ListTrack[]>, newPosition: number) {
        let success;
        const oldPosition = tracks.value.findIndex(t => t.track_id === trackId);
        if (oldPosition === newPosition) {
            return;
        }
        this.moveTrackToPosition(trackId, newPosition, tracks);
        if (type === "album") {
            success = Api.moveTrackInAlbum(listId, tracks.value);
        } else {
            success = Api.moveTrackInPlaylist(listId, tracks.value);
        }
        if (!(await success)) {
            this.moveTrackToPosition(trackId, oldPosition, tracks);
        }
    }

    static async approveCollab(id: number) {
        await Api.approveCollab(id);
        const collab = document.querySelector(`.collab[id="${id}"]`);
        if (collab) {
            collab.remove();
        }
    }

    static async denyCollab(id: number, name = "track") {
        await Api.denyCollab(id, name);
        const collab = document.querySelector(`.collab[id="${id}"]`);
        if (collab) {
            collab.remove();
        }
    }

    static async downloadTrack(track: Track) {
        const start = performance.now();
        let res;
        try {
            res = await Api.getTrackAudio(track.id);
        } catch (e: any) {
            notify(e.toString(), NotificationType.error);
            return;
        }
        const end = performance.now();
        const diff = end - start;
        console.log(`Download took ${diff}ms`);

        let blob: Blob | null = null;
        const fileName: string = `${track.artistname?.length > 0 ? track.artistname : track.user?.displayname} - ${track.title || "track"}.mp3`;
        console.log(`Downloading ${fileName}`, res);

        if (res instanceof Blob) {
            blob = res;
        }

        if (!blob) {
            return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
}
