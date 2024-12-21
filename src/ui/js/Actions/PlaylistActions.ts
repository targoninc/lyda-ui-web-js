import {GenericTemplates} from "../Templates/GenericTemplates.ts";
import {PlaylistTemplates} from "../Templates/PlaylistTemplates.ts";
import {Api} from "../Api/Api.ts";
import {getErrorMessage, Util} from "../Classes/Util.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {navigate} from "../Routing/Router.ts";
import {Signal} from "../../fjsc/src/signals.ts";
import {Playlist} from "../Models/DbModels/Playlist.ts";
import {Track} from "../Models/DbModels/Track.ts";
import {Album} from "../Models/DbModels/Album.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {MediaUploader} from "../Api/MediaUploader.ts";
import {MediaFileType} from "../Enums/MediaFileType.ts";
import {NotificationType} from "../Enums/NotificationType.ts";

export class PlaylistActions {
    static async openAddToPlaylistModal(objectToBeAdded: Album|Track, type: "track"|"album") {
        const res = await Api.getAsync<Playlist[]>(ApiRoutes.getPlaylistsByUserId, {id: objectToBeAdded.user_id});
        if (res.code !== 200) {
            console.error("Failed to get playlists: ", res.data);
            return;
        }
        let modal;
        if (type === "track") {
            modal = GenericTemplates.modal([await PlaylistTemplates.addTrackToPlaylistModal(objectToBeAdded as Track, res.data)], "add-to-playlist");
        } else {
            modal = GenericTemplates.modal([await PlaylistTemplates.addAlbumToPlaylistModal(objectToBeAdded as Album, res.data)], "add-to-playlist");
        }
        Ui.addModal(modal);
    }

    static async openNewPlaylistModal() {
        let modal = GenericTemplates.modal([PlaylistTemplates.newPlaylistModal()], "new-playlist");
        Ui.addModal(modal);
    }

    static async createNewPlaylist(playlist: Partial<Playlist>) {
        const res = await Api.postAsync(ApiRoutes.newPlaylist, playlist);
        if (res.code !== 200) {
            notify("Failed to create playlist: " + getErrorMessage(res), NotificationType.error);
            return;
        }
        notify("Created playlist", NotificationType.success);
    }

    static async deletePlaylist(id: number) {
        const res = await Api.postAsync(ApiRoutes.deletePlaylist, {id});
        if (res.code === 200) {
            PlayManager.removeStreamClient(id);
            QueueManager.removeFromManualQueue(id);
            notify("Successfully deleted playlist", NotificationType.success);
            navigate("profile");
        } else {
            notify("Error trying to delete playlist: " + getErrorMessage(res), NotificationType.error);
        }
    }

    static async addTrackToPlaylists(track_id: number, playlist_ids: number[]) {
        const res = await Api.postAsync(ApiRoutes.addTrackToPlaylists, {
            playlist_ids,
            track_id
        });
        Util.removeModal();
        if (res.code !== 200) {
            notify("Failed to add track to playlists: " + getErrorMessage(res), NotificationType.error);
            return;
        }
        notify("Added track to playlist(s)", NotificationType.success);
    }

    static async removeTrackFromPlaylist(track_id: number, playlist_ids: number[]) {
        const res = await Api.postAsync(ApiRoutes.removeTrackFromPlaylists, {playlist_ids, track_id});
        if (res.code !== 200) {
            notify("Failed to remove track from playlist: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        notify("Removed track from playlist", NotificationType.success);
        return true;
    }

    static async replaceCover(e: MouseEvent, id: number, canEdit: boolean, loading: Signal<boolean>) {
        const target = e.target as HTMLImageElement;
        if (!target || !canEdit) {
            return;
        }
        const oldSrc = target.src;
        let fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async (e) => {
            loading.value = true;
            const fileTarget = e.target as HTMLInputElement;
            const file = fileTarget.files![0];
            try {
                await MediaUploader.upload(MediaFileType.playlistCover, id, file);
                notify("Cover updated", NotificationType.success);
                await Util.updateImage(URL.createObjectURL(file), oldSrc);
            } catch (e: any) {
                notify(e.toString(), NotificationType.error);
            }
            loading.value = false;
        };
        fileInput.onabort = () => loading.value = false;
        fileInput.click();
    }

    static async moveTrackInPlaylist(playlistId, trackId, newPosition) {
        const res = await Api.postAsync(ApiRoutes.reorderPlaylistTracks, {id: playlistId, track_id: trackId, new_position: newPosition});
        if (res.code !== 200) {
            notify("Failed to move track in playlist: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        return true;
    }

    static async likePlaylist(id: number) {
        return await Api.postAsync(ApiRoutes.likePlaylist, { id });
    }

    static async unlikePlaylist(id: number) {
        return await Api.postAsync(ApiRoutes.unlikePlaylist, { id });
    }

    static async toggleLike(id: number, isEnabled: boolean) {
        if (!Util.isLoggedIn()) {
            notify("You must be logged in to like playlists", NotificationType.error);
            return false;
        }
        if (isEnabled) {
            const res = await PlaylistActions.unlikePlaylist(id);
            if (res.code !== 200) {
                return false;
            }
        } else {
            const res = await PlaylistActions.likePlaylist(id);
            if (res.code !== 200) {
                return false;
            }
        }
        return true;
    }

    static async startTrackInPlaylist(playlist: Playlist, trackId: number, stopIfPlaying = false) {
        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying = playingFrom && playingFrom.type === "playlist" && playingFrom.id === playlist.id;
        if (isPlaying && stopIfPlaying) {
            await PlayManager.stopAllAsync();
        } else {
            PlayManager.playFrom("playlist", playlist.title, playlist.id);
            QueueManager.setContextQueue(playlist.tracks!.map(t => t.track_id));
            const track = playlist.tracks!.find(t => t.track_id === trackId);
            if (!track) {
                notify("This track could not be found in this playlist", NotificationType.error);
                return;
            }
            PlayManager.addStreamClientIfNotExists(track.track_id, track.track?.length ?? 0);
            await PlayManager.startAsync(track.track_id);
        }
    }

    static async addAlbumToPlaylists(album_id: number, playlist_ids: number[]) {
        const res = await Api.postAsync(ApiRoutes.addAlbumToPlaylists, {
            playlist_ids,
            album_id
        });
        Util.removeModal();
        if (res.code !== 200) {
            notify(getErrorMessage(res), NotificationType.error);
            return;
        }
        notify("Added album to playlist(s)", NotificationType.success);
    }
}