import {PlaylistTemplates} from "../Templates/music/PlaylistTemplates.ts";
import {Util} from "../Classes/Util.ts";
import {createModal, notify} from "../Classes/Ui.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {navigate} from "../Routing/Router.ts";
import {Signal} from "@targoninc/jess";
import {MediaUploader} from "../Api/MediaUploader.ts";
import {RoutePath} from "../Routing/routes.ts";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import {NotificationType} from "../Enums/NotificationType.ts";
import {MediaFileType} from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import {playingHere} from "../state.ts";
import {Api} from "../Api/Api.ts";

export class PlaylistActions {
    static async openAddToPlaylistModal(objectToBeAdded: Album | Track, type: "track" | "album") {
        const playlists = await Api.getPlaylistsByUserId(objectToBeAdded.user_id);
        if (playlists.length === 0) {
            return;
        }

        if (type === "track") {
            createModal([PlaylistTemplates.addTrackToPlaylistModal(objectToBeAdded as Track, playlists)], "add-to-playlist");
        } else {
            createModal([PlaylistTemplates.addAlbumToPlaylistModal(objectToBeAdded as Album, playlists)], "add-to-playlist");
        }
    }

    static async openNewPlaylistModal() {
        createModal([PlaylistTemplates.newPlaylistModal()], "new-playlist");
    }

    static async deletePlaylist(id: number) {
        const success = await Api.deletePlaylist(id);
        if (success) {
            PlayManager.removeStreamClient(id);
            QueueManager.removeFromManualQueue(id);
            navigate(RoutePath.profile);
        }
    }

    static async addTrackToPlaylists(track_id: number, playlist_ids: number[]) {
        const success = await Api.addTrackToPlaylists(track_id, playlist_ids);
        Util.removeModal();
        return success;
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

    static async startTrackInPlaylist(playlist: Playlist, trackId: number, stopIfPlaying = false) {
        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying = playingFrom && playingFrom.type === "playlist" && playingFrom.id === playlist.id && playingHere.value;

        if (isPlaying && stopIfPlaying) {
            await PlayManager.stopAllAsync();
        } else {
            if (!playlist.tracks) {
                throw new Error(`Invalid album (${playlist.id}), has no tracks.`);
            }
            PlayManager.playFrom("playlist", playlist.title, playlist.id, playlist);
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
        const success = await Api.addAlbumToPlaylists(album_id, playlist_ids);
        Util.removeModal();
        return success;
    }
}
