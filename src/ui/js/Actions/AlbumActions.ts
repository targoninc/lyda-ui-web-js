import {AlbumTemplates} from "../Templates/music/AlbumTemplates.ts";
import {getErrorMessage, Util} from "../Classes/Util.ts";
import {createModal, notify, Ui} from "../Classes/Ui.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {navigate} from "../Routing/Router.ts";
import {Signal} from "@targoninc/jess";
import {MediaUploader} from "../Api/MediaUploader.ts";
import {RoutePath} from "../Routing/routes.ts";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {NotificationType} from "../Enums/NotificationType.ts";
import {ListTrack} from "@targoninc/lyda-shared/src/Models/ListTrack";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";
import {playingHere} from "../state.ts";
import {LydaApi} from "../Api/LydaApi.ts";

export class AlbumActions {
    static async openAddToAlbumModal(track: Track) {
        const albums = await LydaApi.getAlbumsByUserId(track.user_id);
        if (albums.length === 0) {
            return;
        }
        createModal([await AlbumTemplates.addToAlbumModal(track, albums)], "add-to-album");
    }

    static async openNewAlbumModal() {
        createModal([AlbumTemplates.newAlbumModal()], "new-album");
    }

    static async deleteAlbum(id: number) {
        const success = await LydaApi.deleteAlbum(id);
        if (success) {
            PlayManager.removeStreamClient(id);
            QueueManager.removeFromManualQueue(id);
            navigate(RoutePath.profile);
        }
    }

    static async addTrackToAlbums(track_id: number, album_ids: number[]) {
        const success = await LydaApi.addTrackToAlbums(track_id, album_ids);
        Util.removeModal();
        return success;
    }

    static async replaceCover(e: MouseEvent, id: number, canEdit: boolean, loading: Signal<boolean>) {
        const target = e.target as HTMLImageElement;
        if (!target || !canEdit) {
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

    static async startTrackInAlbum(album: Album, trackId: number, stopIfPlaying = false) {
        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying = playingFrom && playingFrom.type === "album" && playingFrom.id === album.id && playingHere.value;

        if (isPlaying && stopIfPlaying) {
            await PlayManager.stopAllAsync();
        } else {
            if (!album.tracks) {
                throw new Error(`Invalid album (${album.id}), has no tracks.`);
            }
            PlayManager.playFrom("album", album.title, album.id, album);
            QueueManager.setContextQueue(album.tracks.map(t => t.track_id));
            const track = album.tracks.find(t => t.track_id === trackId);
            if (!track) {
                notify("This track could not be found in this album", NotificationType.error);
                return;
            }
            PlayManager.addStreamClientIfNotExists(track.track_id, track.track?.length ?? 0);
            await PlayManager.startAsync(track.track_id);
        }
    }
}
