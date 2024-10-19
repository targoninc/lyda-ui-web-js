import {GenericTemplates} from "../Templates/GenericTemplates.ts";
import {AlbumTemplates} from "../Templates/AlbumTemplates.ts";
import {Api} from "../Classes/Api.ts";
import {Util} from "../Classes/Util.ts";
import {Ui} from "../Classes/Ui.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {navigate} from "../Routing/Router.ts";

export class AlbumActions {
    static async deleteAlbumFromElement(e) {
        if (!confirm) {
            return;
        }
        await AlbumActions.deleteAlbum(e.target.id);
    }

    static async openAddToAlbumModal(track) {
        const res = await Api.getAsync(Api.endpoints.albums.byUserId, {user_id: track.userId});
        if (res.code !== 200) {
            console.error("Failed to get albums: ", res.data);
            return;
        }
        let modal = GenericTemplates.modal([await AlbumTemplates.addToAlbumModal(track, res.data)]);
        Ui.addModal(modal);
    }

    static async openNewAlbumModal() {
        let modal = GenericTemplates.modal([AlbumTemplates.newAlbumModal()]);
        Ui.addModal(modal);
    }

    static async createNewAlbum(album) {
        const res = await Api.postAsync(Api.endpoints.albums.actions.new, album);
        if (res.code !== 200) {
            Ui.notify("Failed to create album: " + res.data, "error");
            return;
        }
        Ui.notify("Created album", "success");
    }

    static async deleteAlbum(id) {
        const res = await Api.postAsync(Api.endpoints.albums.actions.delete, {id});
        if (res.code === 200) {
            PlayManager.removeStreamClient(id);
            QueueManager.removeFromManualQueue(id);
            Ui.notify("Successfully deleted album", "success");
            navigate("profile");
        } else {
            Ui.notify("Error trying to delete album: " + res.data, "error");
        }
    }

    static async addTrackToAlbums(track_id) {
        const albums = document.querySelectorAll("input[id^=album_]");
        let albumIds = [];
        for (let album of albums) {
            if (album.checked) {
                const albumId = album.id.split("_")[1];
                albumIds.push(parseInt(albumId));
            }
        }
        const res = await Api.postAsync(Api.endpoints.albums.actions.addTrack, {album_ids: albumIds, track_id});
        Util.removeModal();
        if (res.code !== 200) {
            Ui.notify("Failed to add track to albums: " + res.data, "error");
            return;
        }
        Ui.notify("Added track to albums", "success");
    }

    static async removeTrackFromAlbum(track_id, album_id) {
        const res = await Api.postAsync(Api.endpoints.albums.actions.removeTrack, {id: album_id, track_id});
        if (res.code !== 200) {
            Ui.notify("Failed to remove track from album: " + res.data, "error");
            return false;
        }
        Ui.notify("Removed track from album", "success");
        return true;
    }

    static async openAlbumFromElement(e) {
        let trackId = Util.getAlbumIdFromEvent(e);
        if (trackId === "") {
            return;
        }
        navigate("album/" + trackId);
    }

    static async replaceCover(e) {
        if (e.target.getAttribute("canEdit") !== "true") {
            return;
        }
        const oldSrc = e.target.src;
        const loader = document.querySelector("#cover-loader");
        loader.classList.remove("hidden");
        let fileInput = document.createElement("input");
        const id = parseInt(Util.getAlbumIdFromEvent(e));
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async (e) => {
            let file = e.target.files[0];
            if (!file) {
                loader.classList.add("hidden");
                return;
            }
            let formData = new FormData();
            formData.append("cover", file);
            formData.append("id", id.toString());
            let response = await fetch(Api.endpoints.albums.actions.uploadCover, {
                method: "POST",
                body: formData,
                credentials: "include"
            });
            if (response.status === 200) {
                loader.classList.add("hidden");
                Ui.notify("Cover updated", "success");
                await Util.updateImage(URL.createObjectURL(file), oldSrc);
            }
        };
        fileInput.click();
    }

    static async moveTrackInAlbum(albumId, trackId, newPosition) {
        const res = await Api.postAsync(Api.endpoints.albums.actions.reorderTracks, {id: albumId, track_id: trackId, new_position: newPosition});
        if (res.code !== 200) {
            Ui.notify("Failed to move track in album: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async likeAlbum(id) {
        return await Api.postAsync(Api.endpoints.albums.actions.like, { id });
    }

    static async unlikeAlbum(id) {
        return await Api.postAsync(Api.endpoints.albums.actions.unlike, { id });
    }

    static async toggleLike(id, isEnabled) {
        if (!Util.isLoggedIn()) {
            Ui.notify("You must be logged in to like albums", "error");
            return false;
        }
        if (isEnabled) {
            const res = await AlbumActions.unlikeAlbum(id);
            if (res.code !== 200) {
                return false;
            }
        } else {
            const res = await AlbumActions.likeAlbum(id);
            if (res.code !== 200) {
                return false;
            }
        }
        return true;
    }

    static async startTrackInAlbum(album, trackId, stopIfPlaying = false) {
        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying =
            playingFrom.type === "album" && playingFrom.id === album.id;
        if (isPlaying && stopIfPlaying) {
            await PlayManager.stopAllAsync();
        } else {
            PlayManager.playFrom("album", album.name, album.id);
            QueueManager.setContextQueue(album.albumtracks.map(t => t.id));
            const track = album.albumtracks.find(t => t.id === trackId);
            if (!track) {
                Ui.notify("This track could not be found in this album", "error");
                return;
            }
            PlayManager.addStreamClientIfNotExists(track.id, track.length);
            await PlayManager.startAsync(track.id);
        }
    }
}