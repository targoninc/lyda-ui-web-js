import { PlaylistTemplates } from "../Templates/music/PlaylistTemplates.ts";
import { Util } from "../Classes/Util.ts";
import { createModal, notify } from "../Classes/Ui.ts";
import { PlayManager } from "../Streaming/PlayManager.ts";
import { QueueManager } from "../Streaming/QueueManager.ts";
import { navigate } from "../Routing/Router.ts";
import { RoutePath } from "../Routing/routes.ts";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { Playlist } from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import { playingHere } from "../state.ts";
import { Api } from "../Api/Api.ts";
import { startItem } from "./MusicActions.ts";
import { t } from "../../locales";

export class PlaylistActions {
    static async openAddToPlaylistModal(objectToBeAdded: Album | Track, type: "track" | "album") {
        const playlists = await Api.getPlaylistsByUserId(objectToBeAdded.user_id);
        if (!playlists || playlists.length === 0) {
            notify(`${t("NO_PLAYLISTS_YET")}`);
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

    static async startTrackInPlaylist(playlist: Playlist, track: Track, stopIfPlaying = false) {
        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying = playingFrom && playingFrom.type === "playlist" && playingFrom.id === playlist.id && playingHere.value;

        if (isPlaying && stopIfPlaying) {
            await PlayManager.stopAllAsync();
        } else {
            if (!playlist.tracks) {
                throw new Error(`Invalid album (${playlist.id}), has no tracks.`);
            }

            await startItem(track, {
                entity: playlist,
                type: "playlist",
                id: playlist.id,
                name: playlist.title
            });
        }
    }

    static async addAlbumToPlaylists(album_id: number, playlist_ids: number[]) {
        const success = await Api.addAlbumToPlaylists(album_id, playlist_ids);
        Util.removeModal();
        return success;
    }
}
