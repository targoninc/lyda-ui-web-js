import {GenericTemplates} from "../Templates/GenericTemplates.ts";
import {AlbumTemplates} from "../Templates/AlbumTemplates.ts";
import {Api} from "../Classes/Api.ts";
import {Util} from "../Classes/Util.ts";
import {Ui} from "../Classes/Ui.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {navigate} from "../Routing/Router.ts";
import {Signal} from "../../fjsc/f2.ts";
import {Album} from "../DbModels/Album.ts";
import {Track} from "../DbModels/Track.ts";

export class AlbumActions {
    static async deleteAlbumFromElement(e: any) {
        if (!confirm) {
            return;
        }
        await AlbumActions.deleteAlbum(e.target.id);
    }

    static async openAddToAlbumModal(track: Track) {
        const res = await Api.getAsync(Api.endpoints.albums.byUserId, {user_id: track.user_id});
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

    static async createNewAlbum(album: Album) {
        const res = await Api.postAsync(Api.endpoints.albums.actions.new, album);
        if (res.code !== 200) {
            Ui.notify("Failed to create album: " + res.data, "error");
            return;
        }
        Ui.notify("Created album", "success");
    }

    static async deleteAlbum(id: number) {
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

    static async addTrackToAlbums(track_id: number) {
        const albums = document.querySelectorAll("input[id^=album_]") as NodeListOf<HTMLInputElement>;
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

    static async removeTrackFromAlbum(track_id: number, album_id: number) {
        const res = await Api.postAsync(Api.endpoints.albums.actions.removeTrack, {id: album_id, track_id});
        if (res.code !== 200) {
            Ui.notify("Failed to remove track from album: " + res.data, "error");
            return false;
        }
        Ui.notify("Removed track from album", "success");
        return true;
    }

    static async openAlbumFromElement(e: Event) {
        let trackId = Util.getAlbumIdFromEvent(e);
        if (trackId === "") {
            return;
        }
        navigate("album/" + trackId);
    }

    static async replaceCover(e: MouseEvent, loading: Signal<boolean>) {
        const target = e.target as HTMLImageElement;
        if (target.getAttribute("canEdit") !== "true") {
            return;
        }
        const oldSrc = target.src;
        loading.value = true;
        let fileInput = document.createElement("input");
        const id = parseInt(Util.getAlbumIdFromEvent(e));
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
            let response = await fetch(Api.endpoints.albums.actions.uploadCover, {
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

    static async moveTrackInAlbum(albumId: number, trackId: number, newPosition: number) {
        const res = await Api.postAsync(Api.endpoints.albums.actions.reorderTracks, {id: albumId, track_id: trackId, new_position: newPosition});
        if (res.code !== 200) {
            Ui.notify("Failed to move track in album: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async likeAlbum(id: number) {
        return await Api.postAsync(Api.endpoints.albums.actions.like, { id });
    }

    static async unlikeAlbum(id: number) {
        return await Api.postAsync(Api.endpoints.albums.actions.unlike, { id });
    }

    static async toggleLike(id: number, isEnabled: boolean) {
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

    static async startTrackInAlbum(album: Album, trackId: number, stopIfPlaying = false) {
        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying =
            playingFrom.type === "album" && playingFrom.id === album.id;
        if (isPlaying && stopIfPlaying) {
            await PlayManager.stopAllAsync();
        } else {
            if (!album.tracks) {
                throw new Error(`Invalid album (${album.id}), has no tracks.`);
            }
            PlayManager.playFrom("album", album.name, album.id);
            QueueManager.setContextQueue(album.tracks.map(t => t.id));
            const track = album.tracks.find(t => t.id === trackId);
            if (!track) {
                Ui.notify("This track could not be found in this album", "error");
                return;
            }
            PlayManager.addStreamClientIfNotExists(track.id, track.length);
            await PlayManager.startAsync(track.id);
        }
    }
}