import { AlbumTemplates } from "../Templates/music/AlbumTemplates.ts";
import { Util } from "../Classes/Util.ts";
import { createModal, notify } from "../Classes/Ui.ts";
import { PlayManager } from "../Streaming/PlayManager.ts";
import { QueueManager } from "../Streaming/QueueManager.ts";
import { navigate } from "../Routing/Router.ts";
import { RoutePath } from "../Routing/routes.ts";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { playingHere } from "../state.ts";
import { Api } from "../Api/Api.ts";
import { startItem } from "./MusicActions.ts";
import { t } from "../../locales";

export class AlbumActions {
    static async openAddToAlbumModal(track: Track) {
        const albums = await Api.getAlbumsByUserId(track.user_id);
        if (!albums || albums.length === 0) {
            notify(`${t("NO_ALBUMS_YET")}`);
            return;
        }
        createModal([await AlbumTemplates.addToAlbumModal(track, albums)], "add-to-album");
    }

    static async openNewAlbumModal() {
        createModal([AlbumTemplates.newAlbumModal()], "new-album");
    }

    static async deleteAlbum(id: number) {
        const success = await Api.deleteAlbum(id);
        if (success) {
            PlayManager.removeStreamClient(id);
            QueueManager.removeFromManualQueue(id);
            navigate(RoutePath.profile);
        }
    }

    static async addTrackToAlbums(track_id: number, album_ids: number[]) {
        const success = await Api.addTrackToAlbums(track_id, album_ids);
        Util.removeModal();
        return success;
    }

    static async startTrackInAlbum(album: Album, track: Track, stopIfPlaying = false) {
        const playingFrom = PlayManager.getPlayingFrom();
        const isPlaying =
            playingFrom &&
            playingFrom.type === "album" &&
            playingFrom.id === album.id &&
            playingHere.value;

        if (isPlaying && stopIfPlaying) {
            await PlayManager.stopAllAsync();
        } else {
            if (!album.tracks) {
                throw new Error(`Invalid album (${album.id}), has no tracks.`);
            }

            await startItem(track, {
                entity: album,
                type: "album",
                id: album.id,
                name: album.title
            });
        }
    }
}
