import { Util } from "../Classes/Util.ts";
import { Icons } from "../Enums/Icons.ts";
import { PlayManager } from "../Streaming/PlayManager.ts";
import { TrackEditTemplates } from "../Templates/music/TrackEditTemplates.ts";
import { createModal, notify, Ui } from "../Classes/Ui.ts";
import { navigate, reload } from "../Routing/Router.ts";
import { Signal } from "@targoninc/jess";
import { MediaUploader } from "../Api/MediaUploader.ts";
import { currentQuality, playingHere } from "../state.ts";
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

export class TrackActions {
    static async savePlay(id: number) {
        if (!playingHere.value) {
            console.log("Not saving play because not playing in this tab.");
            return;
        }
        return await Api.savePlay(id, currentQuality.value);
    }

    static savePlayAfterTimeIf(id: number, seconds: number, condition: () => boolean) {
        setTimeout(async () => {
            if (condition()) {
                await TrackActions.savePlay(id);
            }
        }, seconds * 1000);
    }

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

    static async replaceCover(id: number, canEdit: boolean, oldSrc: Signal<string>, loading: Signal<boolean>) {
        if (!canEdit) {
            return;
        }
        loading.value = true;
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async (e) => {
            const fileTarget = e.target as HTMLInputElement;
            const file = fileTarget.files![0];
            if (!file) {
                loading.value = false;
                return;
            }

            try {
                await MediaUploader.upload(MediaFileType.trackCover, id, file);
                notify(`${t("COVER_UPLOADED")}`, NotificationType.success);
                await Util.updateImage(URL.createObjectURL(file), oldSrc.value);
            } catch (e) {
                notify(`${t("FAILED_UPLOADING_COVER")}`, NotificationType.error);
            }
            loading.value = false;
        };
        fileInput.onabort = () => loading.value = false;
        fileInput.click();
    }

    static async replaceAudio(id: number, canEdit: boolean, loading: Signal<boolean>, onSuccess: () => void = () => {}) {
        if (!canEdit) {
            return;
        }
        loading.value = true;
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "audio/*";
        fileInput.onchange = async (e) => {
            const fileTarget = e.target as HTMLInputElement;
            const file = fileTarget.files![0];
            if (!file) {
                loading.value = false;
                return;
            }
            try {
                await MediaUploader.upload(MediaFileType.audio, id, file);
                notify(`${t("AUDIO_UPLOADED")}`, NotificationType.success);
                onSuccess();
            } catch (e) {
                notify(`${t("FAILED_UPLOADING_AUDIO")}`, NotificationType.error);
            }
            loading.value = false;
        };
        fileInput.onabort = () => loading.value = false;
        fileInput.oncancel = () => loading.value = false;
        fileInput.onreset = () => loading.value = false;
        fileInput.click();
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

    static getTrackEditModal(track: Track) {
        const confirmCallback2 = async (newTrack: Track) => {
            Util.removeModal();
            await Api.updateTrackFull(newTrack);
            notify(`${t("TRACK_UPDATED")}`, NotificationType.success);
            reload();
        };
        const cancelCallback2 = () => {
            Util.removeModal();
        };
        createModal([TrackEditTemplates.editTrackModal(track, confirmCallback2, cancelCallback2)], "track-edit");
    }

    static async downloadTrack(track: Track) {
        const start = performance.now();
        const res = await Api.getTrackAudio(track.id);
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
