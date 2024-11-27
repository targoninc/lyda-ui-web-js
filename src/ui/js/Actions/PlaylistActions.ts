import {GenericTemplates} from "../Templates/GenericTemplates.ts";
import {PlaylistTemplates} from "../Templates/PlaylistTemplates.ts";
import {Api} from "../Api/Api.ts";
import {Util} from "../Classes/Util.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {navigate} from "../Routing/Router.ts";
import {Signal} from "../../fjsc/src/f2.ts";
import {Playlist} from "../Models/DbModels/Playlist.ts";
import {Track} from "../Models/DbModels/Track.ts";
import {Album} from "../Models/DbModels/Album.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {MediaUploader} from "../Api/MediaUploader.ts";
import {MediaFileType} from "../Enums/MediaFileType.ts";

export class PlaylistActions {
    static async openAddToPlaylistModal(objectToBeAdded: Album|Track, type: "track"|"album") {
        const res = await Api.getAsync(ApiRoutes.getPlaylistsByUserId, {user_id: objectToBeAdded.user_id});
        if (res.code !== 200) {
            console.error("Failed to get playlists: ", res.data);
            return;
        }
        let modal;
        if (type === "track") {
            modal = GenericTemplates.modal([await PlaylistTemplates.addTrackToPlaylistModal(objectToBeAdded as Track, res.data)]);
        } else {
            modal = GenericTemplates.modal([await PlaylistTemplates.addAlbumToPlaylistModal(objectToBeAdded as Album, res.data)]);
        }
        Ui.addModal(modal);
    }

    static async openNewPlaylistModal() {
        let modal = GenericTemplates.modal([PlaylistTemplates.newPlaylistModal()]);
        Ui.addModal(modal);
    }

    static async createNewPlaylist(playlist: Partial<Playlist>) {
        const res = await Api.postAsync(ApiRoutes.newPlaylist, playlist);
        if (res.code !== 200) {
            notify("Failed to create playlist: " + res.data, "error");
            return;
        }
        notify("Created playlist", "success");
    }

    static async deletePlaylist(id: number) {
        const res = await Api.postAsync(ApiRoutes.deletePlaylist, {id});
        if (res.code === 200) {
            PlayManager.removeStreamClient(id);
            QueueManager.removeFromManualQueue(id);
            notify("Successfully deleted playlist", "success");
            navigate("profile");
        } else {
            notify("Error trying to delete playlist: " + res.data, "error");
        }
    }

    static async addTrackToPlaylists(id: number) {
        const playlists = document.querySelectorAll("input[id^=playlist_]") as NodeListOf<HTMLInputElement>;
        let playlistIds = [];
        for (let playlist of playlists) {
            if (playlist.checked) {
                playlistIds.push(playlist.id.split("_")[1]);
            }
        }
        const res = await Api.postAsync(ApiRoutes.addTrackToPlaylists, {playlist_ids: playlistIds, track_id: id});
        Util.removeModal();
        if (res.code !== 200) {
            notify("Failed to add track to playlists: " + res.data, "error");
            return;
        }
        notify("Added track to playlist(s)", "success");
    }

    static async removeTrackFromPlaylist(track_id: number, playlist_id: number) {
        const res = await Api.postAsync(ApiRoutes.removeTrackFromPlaylist, {id: playlist_id, track_id});
        if (res.code !== 200) {
            notify("Failed to remove track from playlist: " + res.data, "error");
            return false;
        }
        notify("Removed track from playlist", "success");
        return true;
    }

    static async replaceCover(e: MouseEvent, loading: Signal<boolean>) {
        const target = e.target as HTMLImageElement;
        if (!target || target.getAttribute("canEdit") !== "true") {
            return;
        }
        const oldSrc = target.src;
        loading.value = true;
        let fileInput = document.createElement("input");
        const id = parseInt(Util.getPlaylistIdFromEvent(e));
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async (e) => {
            const fileTarget = e.target as HTMLInputElement;
            const file = fileTarget.files![0];
            const response = await MediaUploader.upload(MediaFileType.playlistCover, id, file);
            if (response.code === 200) {
                loading.value = false;
                notify("Cover updated", "success");
                await Util.updateImage(URL.createObjectURL(file), oldSrc);
            }
        };
        fileInput.click();
    }

    static async moveTrackInPlaylist(playlistId, trackId, newPosition) {
        const res = await Api.postAsync(ApiRoutes.reorderPlaylistTracks, {id: playlistId, track_id: trackId, new_position: newPosition});
        if (res.code !== 200) {
            notify("Failed to move track in playlist: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async likePlaylist(id) {
        return await Api.postAsync(ApiRoutes.likePlaylist, { id });
    }

    static async unlikePlaylist(id) {
        return await Api.postAsync(ApiRoutes.unlikePlaylist, { id });
    }

    static async toggleLike(id, isEnabled) {
        if (!Util.isLoggedIn()) {
            notify("You must be logged in to like playlists", "error");
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

    static async startTrackInPlaylist(playlist, trackId, stopIfPlaying = false) {
        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying =
            playingFrom.type === "playlist" && playingFrom.id === playlist.id;
        if (isPlaying && stopIfPlaying) {
            await PlayManager.stopAllAsync();
        } else {
            PlayManager.playFrom("playlist", playlist.title, playlist.id);
            QueueManager.setContextQueue(playlist.playlisttracks.map(t => t.id));
            const track = playlist.playlisttracks.find(t => t.id === trackId);
            if (!track) {
                notify("This track could not be found in this playlist", "error");
                return;
            }
            PlayManager.addStreamClientIfNotExists(track.id, track.length);
            await PlayManager.startAsync(track.id);
        }
    }

    static async addAlbumToPlaylists(id) {
        const playlists = document.querySelectorAll("input[id^=playlist_]") as NodeListOf<HTMLInputElement>;
        let playlistIds = [];
        for (let playlist of playlists) {
            if (playlist.checked) {
                playlistIds.push(playlist.id.split("_")[1]);
            }
        }
        const res = await Api.postAsync(ApiRoutes.addAlbumToPlaylists, {playlist_ids: playlistIds, album_id: id});
        Util.removeModal();
        if (res.code !== 200) {
            notify(res.data, "error");
            return;
        }
        notify("Added album to playlist(s)", "success");
    }
}