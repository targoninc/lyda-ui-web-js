import {GenericTemplates} from "../Templates/GenericTemplates.ts";
import {AlbumTemplates} from "../Templates/AlbumTemplates.ts";
import {Api} from "../Api/Api.ts";
import {Util} from "../Classes/Util.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {navigate} from "../Routing/Router.ts";
import {Signal} from "../../fjsc/src/signals.ts";
import {Album} from "../Models/DbModels/Album.ts";
import {Track} from "../Models/DbModels/Track.ts";
import {MediaUploader} from "../Api/MediaUploader.ts";
import {MediaFileType} from "../Enums/MediaFileType.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";

export class AlbumActions {
    static async deleteAlbumFromElement(e: any) {
        if (!confirm) {
            return;
        }
        await AlbumActions.deleteAlbum(e.target.id);
    }

    static async openAddToAlbumModal(track: Track) {
        const res = await Api.getAsync(ApiRoutes.getAlbumsByUserId, {id: track.user_id});
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

    static async createNewAlbum(album: Partial<Album>) {
        const res = await Api.postAsync(ApiRoutes.newAlbum, album);
        if (res.code !== 200) {
            notify("Failed to create album: " + res.data, "error");
            return;
        }
        notify("Created album", "success");
    }

    static async deleteAlbum(id: number) {
        const res = await Api.postAsync(ApiRoutes.deleteAlbum, {id});
        if (res.code === 200) {
            PlayManager.removeStreamClient(id);
            QueueManager.removeFromManualQueue(id);
            notify("Successfully deleted album", "success");
            navigate("profile");
        } else {
            notify("Error trying to delete album: " + res.data, "error");
        }
    }

    static async addTrackToAlbums(track_id: number, album_ids: number[]) {
        const res = await Api.postAsync(ApiRoutes.addTrackToAlbums, {album_ids, track_id});
        Util.removeModal();
        if (res.code !== 200) {
            notify("Failed to add track to albums: " + res.data, "error");
            return;
        }
        notify("Added track to albums", "success");
    }

    static async removeTrackFromAlbum(track_id: number, album_ids: number[]) {
        const res = await Api.postAsync(ApiRoutes.removeTrackFromAlbums, {album_ids, track_id});
        if (res.code !== 200) {
            notify("Failed to remove track from album: " + res.data, "error");
            return false;
        }
        notify("Removed track from album", "success");
        return true;
    }

    static async replaceCover(e: MouseEvent, id: number, loading: Signal<boolean>) {
        const target = e.target as HTMLImageElement;
        if (target.getAttribute("canEdit") !== "true") {
            return;
        }
        const oldSrc = target.src;
        loading.value = true;
        let fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async (e) => {
            const fileTarget = e.target as HTMLInputElement;
            const file = fileTarget.files![0];
            try {
                await MediaUploader.upload(MediaFileType.albumCover, id, file)
                loading.value = false;
                notify("Cover updated", "success");
                await Util.updateImage(URL.createObjectURL(file), oldSrc);
            } catch (e) {
                loading.value = false;
                notify(e, "error");
            }
        };
        fileInput.click();
    }

    static async moveTrackInAlbum(albumId: number, trackId: number, newPosition: number) {
        const res = await Api.postAsync(ApiRoutes.reorderAlbumTracks, {id: albumId, track_id: trackId, new_position: newPosition});
        if (res.code !== 200) {
            notify("Failed to move track in album: " + res.data, "error");
            return false;
        }
        return true;
    }

    static async likeAlbum(id: number) {
        return await Api.postAsync(ApiRoutes.likeAlbum, { id });
    }

    static async unlikeAlbum(id: number) {
        return await Api.postAsync(ApiRoutes.unlikeAlbum, { id });
    }

    static async toggleLike(id: number, isEnabled: boolean) {
        if (!Util.isLoggedIn()) {
            notify("You must be logged in to like albums", "error");
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
            PlayManager.playFrom("album", album.title, album.id);
            QueueManager.setContextQueue(album.tracks.map(t => t.track_id));
            const track = album.tracks.find(t => t.track_id === trackId);
            if (!track) {
                notify("This track could not be found in this album", "error");
                return;
            }
            PlayManager.addStreamClientIfNotExists(track.track_id, track.track?.length ?? 0);
            await PlayManager.startAsync(track.track_id);
        }
    }
}