import {PlaylistTemplates} from "../Templates/music/PlaylistTemplates.ts";
import {HttpClient} from "../Api/HttpClient.ts";
import {getErrorMessage, Util} from "../Classes/Util.ts";
import {createModal, notify, Ui} from "../Classes/Ui.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {QueueManager} from "../Streaming/QueueManager.ts";
import {navigate} from "../Routing/Router.ts";
import {Signal} from "@targoninc/jess";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {MediaUploader} from "../Api/MediaUploader.ts";
import {RoutePath} from "../Routing/routes.ts";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import {NotificationType} from "../Enums/NotificationType.ts";
import {MediaFileType} from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import {ListTrack} from "@targoninc/lyda-shared/src/Models/ListTrack";
import {playingHere} from "../state.ts";

export class PlaylistActions {
    static async openAddToPlaylistModal(objectToBeAdded: Album | Track, type: "track" | "album") {
        const res = await HttpClient.getAsync<Playlist[]>(ApiRoutes.getPlaylistsByUserId, {id: objectToBeAdded.user_id});
        if (res.code !== 200) {
            console.error("Failed to get playlists: ", res.data);
            return;
        }

        if (type === "track") {
            createModal([PlaylistTemplates.addTrackToPlaylistModal(objectToBeAdded as Track, res.data)], "add-to-playlist");
        } else {
            createModal([PlaylistTemplates.addAlbumToPlaylistModal(objectToBeAdded as Album, res.data)], "add-to-playlist");
        }
    }

    static async openNewPlaylistModal() {
        createModal([PlaylistTemplates.newPlaylistModal()], "new-playlist");
    }

    static async createNewPlaylist(playlist: Partial<Playlist>) {
        const res = await HttpClient.postAsync(ApiRoutes.newPlaylist, playlist);
        if (res.code !== 200) {
            notify("Failed to create playlist: " + getErrorMessage(res), NotificationType.error);
            return;
        }
        notify("Created playlist", NotificationType.success);
    }

    static async deletePlaylist(id: number) {
        const res = await HttpClient.postAsync(ApiRoutes.deletePlaylist, {id});
        if (res.code === 200) {
            PlayManager.removeStreamClient(id);
            QueueManager.removeFromManualQueue(id);
            notify("Successfully deleted playlist", NotificationType.success);
            navigate(RoutePath.profile);
        } else {
            notify("Error trying to delete playlist: " + getErrorMessage(res), NotificationType.error);
        }
    }

    static async addTrackToPlaylists(track_id: number, playlist_ids: number[]) {
        const res = await HttpClient.postAsync(ApiRoutes.addTrackToPlaylists, {
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
        const res = await HttpClient.postAsync(ApiRoutes.removeTrackFromPlaylists, {playlist_ids, track_id});
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

    static async moveTrackInPlaylist(playlistId: number, tracks: ListTrack[]) {
        const res = await HttpClient.postAsync(ApiRoutes.reorderPlaylistTracks, {
            playlist_id: playlistId,
            tracks
        });
        if (res.code !== 200) {
            notify("Failed to move tracks: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        return true;
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
        const res = await HttpClient.postAsync(ApiRoutes.addAlbumToPlaylists, {
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