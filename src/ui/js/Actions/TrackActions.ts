import {HttpClient} from "../Api/HttpClient.ts";
import {getErrorMessage, Util} from "../Classes/Util.ts";
import {Icons} from "../Enums/Icons.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {AlbumActions} from "./AlbumActions.ts";
import {PlaylistActions} from "./PlaylistActions.ts";
import {TrackEditTemplates} from "../Templates/music/TrackEditTemplates.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {navigate, reload} from "../Routing/Router.ts";
import {Signal} from "@targoninc/jess";
import {MediaUploader} from "../Api/MediaUploader.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {currentQuality, playingHere} from "../state.ts";
import {RoutePath} from "../Routing/routes.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import {Comment} from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import {CollaboratorType} from "@targoninc/lyda-shared/src/Models/db/lyda/CollaboratorType";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";
import {ListTrack} from "@targoninc/lyda-shared/src/Models/ListTrack";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {TrackCollaborator} from "@targoninc/lyda-shared/src/Models/db/lyda/TrackCollaborator";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";

export class TrackActions {
    static async savePlay(id: number) {
        if (!playingHere.value) {
            console.log("Not saving play because not playing in this tab.");
            return;
        }
        return await HttpClient.postAsync(ApiRoutes.saveTrackPlay, { id, quality: currentQuality.value });
    }

    static savePlayAfterTimeIf(id: number, seconds: number, condition: () => boolean) {
        setTimeout(async () => {
            if (condition()) {
                await TrackActions.savePlay(id);
            }
        }, seconds * 1000);
    }

    static async unfollowUser(userId: number) {
        const res = await HttpClient.postAsync(ApiRoutes.unfollowUser, {
            id: userId
        });

        if (res.code !== 200) {
            notify("Error while trying to unfollow user: " + getErrorMessage(res), NotificationType.error);
        }

        return res;
    }

    static async deleteTrack(id: number) {
        if (!confirm) {
            return;
        }
        const res = await HttpClient.postAsync(ApiRoutes.deleteTrack, { id });
        if (res.code === 200) {
            await PlayManager.removeTrackFromAllStates(id);
            notify(res.data, NotificationType.success);
            navigate(RoutePath.profile);
        } else {
            notify("Error trying to delete track: " + getErrorMessage(res), NotificationType.error);
        }
    }

    static async deleteComment(commentId: number, comments: Signal<Comment[]>) {
        await Ui.getConfirmationModal("Delete comment", "Are you sure you want to delete this comment?", "Yes", "No", async () => {
            const res = await HttpClient.postAsync(ApiRoutes.deleteComment, {
                id: commentId,
            });

            if (res.code !== 200) {
                notify(getErrorMessage(res), NotificationType.error);
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
            notify("Comment deleted", NotificationType.success);
        }, () => {
        }, Icons.WARNING);
    }

    static async newComment(content: Signal<string>, comments: Signal<Comment[]>, track_id: number, parentCommentId: number|null = null) {
        if (!content.value || content.value === "") {
            return;
        }
        if (content.value.length > 1000) {
            notify("Comment is too long", NotificationType.error);
            return;
        }

        const res = await HttpClient.postAsync(ApiRoutes.newComment, {
            id: track_id,
            content: content.value,
            parentId: parentCommentId ? parentCommentId : null,
        });

        if (res.code !== 200) {
            notify(getErrorMessage(res), NotificationType.error);
            return;
        }

        const user = await Util.getUserAsync();

        let nowUtc = new Date();
        const offset = nowUtc.getTimezoneOffset() * 60000;
        nowUtc = new Date(nowUtc.getTime() + offset);
        const createdId = parseInt(res.data);

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
            canEdit: true
        };
        comments.value = [...comments.value, comment];
        content.value = "";
    }

    static async likeTrack(id: number) {
        return await HttpClient.postAsync(ApiRoutes.likeTrack, { id });
    }

    static async unlikeTrack(id: number) {
        return await HttpClient.postAsync(ApiRoutes.unlikeTrack, { id });
    }

    static async repostTrack(id: number) {
        const res = await HttpClient.postAsync(ApiRoutes.repostTrack, { id });
        if (res.code !== 200) {
            notify("Failed to repost track: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        return true;
    }

    static async unrepostTrack(id: number) {
        const res = await HttpClient.postAsync(ApiRoutes.unrepostTrack, { id });
        if (res.code !== 200) {
            notify("Failed to unrepost track: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        return true;
    }

    static async toggleFollow(userId: number, following: Signal<boolean>) {
        if (following.value) {
            const res = await TrackActions.unfollowUser(userId);
            if (res.code !== 200) {
                return false;
            }
            notify(`Successfully unfollowed user`, NotificationType.success);
        } else {
            const res = await TrackActions.followUser(userId);
            if (res.code !== 200) {
                return;
            }
            notify(`Successfully followed user`, NotificationType.success);
        }
        following.value = !following.value;
    }

    static async followUser(userId: number) {
        const res = await HttpClient.postAsync(ApiRoutes.followUser, {
            id: userId,
        });

        if (res.code !== 200) {
            notify("Error while trying to follow user: " + getErrorMessage(res), NotificationType.error);
        }

        return res;
    }

    static async getCollabTypes() {
        const res = await HttpClient.getAsync<CollaboratorType[]>(ApiRoutes.getTrackCollabTypes);
        if (res.code !== 200) {
            notify("Error while trying to get collab types: " + getErrorMessage(res), NotificationType.error);
            return [];
        }
        return res.data as CollaboratorType[];
    }

    static async toggleLike(id: number, isEnabled: boolean) {
        if (!Util.isLoggedIn()) {
            notify("You must be logged in to like tracks", NotificationType.error);
            return false;
        }
        if (isEnabled) {
            const res = await TrackActions.unlikeTrack(id);
            if (res.code !== 200) {
                return false;
            }
        } else {
            const res = await TrackActions.likeTrack(id);
            if (res.code !== 200) {
                return false;
            }
        }
        return true;
    }

    static async toggleRepost(id: number, isEnabled: boolean) {
        if (!Util.isLoggedIn()) {
            notify("You must be logged in to repost tracks", NotificationType.error);
            return false;
        }
        if (isEnabled) {
            return await TrackActions.unrepostTrack(id);
        } else {
            return await TrackActions.repostTrack(id);
        }
    }

    static async replaceCover(id: number, canEdit: boolean, oldSrc: Signal<string>, loading: Signal<boolean>) {
        if (!canEdit) {
            return;
        }
        loading.value = true;
        let fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async (e) => {
            const fileTarget = e.target as HTMLInputElement;
            let file = fileTarget.files![0];
            if (!file) {
                loading.value = false;
                return;
            }

            try {
                await MediaUploader.upload(MediaFileType.trackCover, id, file);
                notify("Cover updated", NotificationType.success);
                await Util.updateImage(URL.createObjectURL(file), oldSrc.value);
            } catch (e) {
                notify("Failed to upload cover", NotificationType.error);
            }
            loading.value = false;
        };
        fileInput.onabort = () => loading.value = false;
        fileInput.click();
    }

    static async replaceAudio(id: number, canEdit: boolean, loading: Signal<boolean>, onSuccess: Function = () => {}) {
        if (!canEdit) {
            return;
        }
        loading.value = true;
        let fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "audio/*";
        fileInput.onchange = async (e) => {
            const fileTarget = e.target as HTMLInputElement;
            let file = fileTarget.files![0];
            if (!file) {
                loading.value = false;
                return;
            }
            try {
                await MediaUploader.upload(MediaFileType.audio, id, file);
                notify("Audio updated", NotificationType.success);
                onSuccess();
            } catch (e) {
                notify("Failed to upload audio", NotificationType.error);
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
            position: index
        }));
    }

    static async removeTrackFromList(tracks: Signal<ListTrack[]>, list: Playlist | Album, type: string, track: ListTrack) {
        await Ui.getConfirmationModal("Remove track from " + type, `Are you sure you want to remove this track from "${list.title}"?`, "Yes", "No", async () => {
            let success;
            if (type === "album") {
                success = await AlbumActions.removeTrackFromAlbum(track.track_id, [list.id]);
            } else {
                success = await PlaylistActions.removeTrackFromPlaylist(track.track_id, [list.id]);
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
            success = AlbumActions.moveTrackInAlbum(listId, tracks.value);
        } else {
            success = PlaylistActions.moveTrackInPlaylist(listId, tracks.value);
        }
        if (!(await success)) {
            this.moveTrackToPosition(trackId, oldPosition, tracks);
        }
    }

    static async removeCollaboratorFromTrack(trackId: number, userId: number) {
        const res = await HttpClient.postAsync(ApiRoutes.removeCollaborator, {
            id: trackId,
            userId: userId,
        });

        if (res.code !== 200) {
            notify("Error while trying to remove collaborator: " + getErrorMessage(res), NotificationType.error);
            return;
        }

        const collaborator = document.querySelector(".collaborator[user_id='" + userId + "']");
        if (collaborator) collaborator.remove();
    }

    static async addCollaboratorToTrack(trackId: number, userId: number, collabType: number) {
        const res = await HttpClient.postAsync<TrackCollaborator>(ApiRoutes.addCollaborator, {
            id: trackId,
            userId: userId,
            collabType: collabType,
        });

        if (res.code !== 200) {
            notify("Error while trying to add collaborator: " + getErrorMessage(res), NotificationType.error);
            return;
        }

        return res.data;
    }

    static async updateTrackProperty(trackId: number, property: string, initialValue: string, callback: Function|null = null) {
        Ui.getTextAreaInputModal("Edit " + property, "Enter new track " + property, initialValue, "Save", "Cancel", async (value: string) => {
            const res = await HttpClient.postAsync(ApiRoutes.updateTrack, {
                id: trackId,
                field: property,
                value
            });
            if (res.code !== 200) {
                notify("Failed to update " + property, NotificationType.error);
                return;
            }
            notify(property + " updated", NotificationType.success);
            if (callback) {
                callback(value);
            }
        }, () => {
        }, Icons.PEN).then();
    }

    static async getUnapprovedTracks() {
        const res = await HttpClient.getAsync<any[]>(ApiRoutes.getUnapprovedCollabs);
        if (res.code !== 200) {
            notify("Error while trying to get unapproved tracks: " + getErrorMessage(res), NotificationType.error);
            return [];
        }
        return res.data;
    }

    static async approveCollab(id: number, name = "track") {
        const res = await HttpClient.postAsync(ApiRoutes.approveCollab, {
            id: id,
        });
        if (res.code !== 200) {
            notify("Error while trying to approve collab: " + getErrorMessage(res), NotificationType.error);
            return;
        }

        notify(`Collab on ${name} approved`, NotificationType.success);
        const collab = document.querySelector(".collab[id='" + id + "']");
        if (collab) {
            collab.remove();
        }
    }

    static async denyCollab(id: number, name = "track") {
        const res = await HttpClient.postAsync(ApiRoutes.denyCollab, {
            id: id,
        });
        if (res.code !== 200) {
            notify("Error while trying to deny collab: " + getErrorMessage(res), NotificationType.error);
            return;
        }

        notify(`Collab on ${name} denied`, NotificationType.success);
        const collab = document.querySelector(".collab[id='" + id + "']");
        if (collab) {
            collab.remove();
        }
    }

    static async updateTrackFull(track: Partial<Track>) {
        const res = await HttpClient.postAsync(ApiRoutes.updateTrackFull, {
            id: track.id,
            title: track.title,
            collaborators: track.collaborators,
            artistname: track.artistname,
            description: track.description,
            genre: track.genre,
            release_date: track.release_date,
            visibility: track.visibility,
            isrc: track.isrc,
            upc: track.upc,
            price: track.price,
        });
        if (res.code !== 200) {
            notify("Error while trying to update track: " + getErrorMessage(res), NotificationType.error);
            return;
        }

        return res.data;
    }

    static getTrackEditModal(track: Track) {
        const confirmCallback2 = async (newTrack: Track) => {
            Util.removeModal();
            await TrackActions.updateTrackFull(newTrack);
            notify("Track updated", NotificationType.success);
            reload();
        };
        const cancelCallback2 = () => {
            Util.removeModal();
        };
        const modal = TrackEditTemplates.editTrackModal(track, confirmCallback2, cancelCallback2);
        Ui.addModal(modal);
    }
}