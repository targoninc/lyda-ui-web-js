import {GenericTemplates} from "../Templates/GenericTemplates.ts";
import {PlaylistTemplates} from "../Templates/PlaylistTemplates.ts";
import {Api} from "../Classes/Api.ts";
import {Util} from "../Classes/Util.ts";
import {Ui} from "../Classes/Ui.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {navigate} from "../Routing/Router.ts";
import {Signal} from "../../fjsc/f2.ts";

export class PlaylistActions {
    static async deletePlaylistFromElement(e) {
        if (!confirm) {
            return;
        }
        await PlaylistActions.deletePlaylist(e.target.id);
    }

    static async openAddToPlaylistModal(objectToBeAdded, type) {
        const res = await Api.getAsync(Api.endpoints.playlists.byUserId, {user_id: objectToBeAdded.userId});
        if (res.code !== 200) {
            console.error("Failed to get playlists: ", res.data);
            return;
        }
        let modal;
        if (type === "track") {
            modal = GenericTemplates.modal([await PlaylistTemplates.addTrackToPlaylistModal(objectToBeAdded, res.data)]);
        } else {
            modal = GenericTemplates.modal([await PlaylistTemplates.addAlbumToPlaylistModal(objectToBeAdded, res.data)]);
        }
        Ui.addModal(modal);
    }

    static async openNewPlaylistModal() {
        let modal = GenericTemplates.modal([PlaylistTemplates.newPlaylistModal()]);
        Ui.addModal(modal);
    }

    static async createNewPlaylist(playlist) {
        const res = await Api.postAsync(Api.endpoints.playlists.actions.new, playlist);
        if (res.code !== 200) {
            Ui.notify("Failed to create playlist: " + res.data, "error");
            return;
        }
        Ui.notify("Created playlist", "success");
    }

    static async deletePlaylist(id: number) {
        const res = await Api.postAsync(Api.endpoints.playlists.actions.delete, {id});
        if (res.code === 200) {
            PlayManager.removeStreamClient(id);
            QueueManager.removeFromManualQueue(id);
            Ui.notify("Successfully deleted playlist", "success");
            navigate("profile");
        } else {
            Ui.notify("Error trying to delete playlist: " + res.data, "error");
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
        const res = await Api.postAsync(Api.endpoints.playlists.actions.addTrack, {playlist_ids: playlistIds, track_id: id});
        Util.removeModal();
        if (res.code !== 200) {
            Ui.notify("Failed to add track to playlists: " + res.data, "error");
            return;
        }
        Ui.notify("Added track to playlist(s)", "success");
    }

    static async removeTrackFromPlaylist(track_id: number, playlist_id: number) {
        const res = await Api.postAsync(Api.endpoints.playlists.actions.removeTrack, {id: playlist_id, track_id});
        if (res.code !== 200) {
            Ui.notify("Failed to remove track from playlist: " + res.data, "error");
            return false;
        }
        Ui.notify("Removed track from playlist", "success");
        return true;
    }

    static async openPlaylistFromElement(e) {
        let trackId = Util.getPlaylistIdFromEvent(e);
        if (trackId === "") {
            return;
        }
        navigate("playlist/" + trackId);
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
            let file = fileTarget.files![0];
            if (!file) {
                loading.value = false;
                return;
            }
            let formData = new FormData();
            formData.append("cover", file);
            formData.append("id", id.toString());
            let response = await fetch(Api.endpoints.playlists.actions.uploadCover, {
                method: "POST",
                body: formData,
                credentials: "include"
            });
            if (response.status === 200) {
                loading.value = false;
                Ui.notify("Cover updated", "success");
                await Util.updateImage(URL.createObjectURL(file), oldSrc);
            }
        };
        fileInput.click();
    }

    static async moveTrackInPlaylist(playlistId, trackId, newPosition) {
        const res = await Api.postAsync(Api.endpoints.playlists.actions.reorderTracks, {id: playlistId, track_id: trackId, new_position: newPosition});
        if (res.code !== 200) {
            Ui.notify("Failed to move track in playlist: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async likePlaylist(id) {
        return await Api.postAsync(Api.endpoints.playlists.actions.like, { id });
    }

    static async unlikePlaylist(id) {
        return await Api.postAsync(Api.endpoints.playlists.actions.unlike, { id });
    }

    static async toggleLike(id, isEnabled) {
        if (!Util.isLoggedIn()) {
            Ui.notify("You must be logged in to like playlists", "error");
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
            PlayManager.playFrom("playlist", playlist.name, playlist.id);
            QueueManager.setContextQueue(playlist.playlisttracks.map(t => t.id));
            const track = playlist.playlisttracks.find(t => t.id === trackId);
            if (!track) {
                Ui.notify("This track could not be found in this playlist", "error");
                return;
            }
            PlayManager.addStreamClientIfNotExists(track.id, track.length);
            await PlayManager.startAsync(track.id);
        }
    }

    static async addAlbumToPlaylists(id) {
        const playlists = document.querySelectorAll("input[id^=playlist_]");
        let playlistIds = [];
        for (let playlist of playlists) {
            if (playlist.checked) {
                playlistIds.push(playlist.id.split("_")[1]);
            }
        }
        const res = await Api.postAsync(Api.endpoints.playlists.actions.addAlbum, {playlist_ids: playlistIds, album_id: id});
        Util.removeModal();
        if (res.code !== 200) {
            Ui.notify(res.data, "error");
            return;
        }
        Ui.notify("Added album to playlist(s)", "success");
    }
}