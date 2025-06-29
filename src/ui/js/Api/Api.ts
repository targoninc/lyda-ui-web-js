import {HttpClient} from "./HttpClient.ts";
import {notify} from "../Classes/Ui.ts";
import {Signal} from "@targoninc/jess";
import {ApiRoutes} from "./ApiRoutes.ts";
import {currentUser} from "../state.ts";
import {getErrorMessage} from "../Classes/Util.ts";
import {Log} from "@targoninc/lyda-shared/src/Models/db/lyda/Log";
import {NotificationType} from "../Enums/NotificationType.ts";
import {User} from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import {Album} from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {ListTrack} from "@targoninc/lyda-shared/src/Models/ListTrack";
import {Playlist} from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import {CollaboratorType} from "@targoninc/lyda-shared/src/Models/db/lyda/CollaboratorType";
import {TrackCollaborator} from "@targoninc/lyda-shared/src/Models/db/lyda/TrackCollaborator";
import {Library} from "@targoninc/lyda-shared/dist/Models/Library";
import {RoyaltyInfo} from "@targoninc/lyda-shared/src/Models/RoyaltyInfo";

export class Api {
    static getLogs(filterState: Signal<any>, successCallback: Function) {
        const errorText = "Failed to get logs";
        HttpClient.getAsync<Log[]>(ApiRoutes.getLogs, {
            logLevel: filterState.value,
            offset: 0,
            limit: 50
        }).then(logs => {
            Api.handleResponse(logs, errorText, successCallback);
        });

        filterState.subscribe(async (newValue) => {
            HttpClient.getAsync<Log[]>(ApiRoutes.getLogs, {
                logLevel: newValue,
                offset: 0,
                limit: 100
            }).then(logs => {
                Api.handleResponse(logs, errorText, successCallback);
            });
        });
    }

    static handleResponse(response: any, errorText: string, successCallback: Function) {
        if (response.code !== 200) {
            notify(errorText, NotificationType.error);
            return;
        }
        successCallback(response.data);
    }

    static async deleteUser() {
        return await HttpClient.postAsync(ApiRoutes.deleteUser);
    }

    static async updateUser(user: Partial<User>) {
        const res = await HttpClient.postAsync(ApiRoutes.updateUser, { user });
        if (res.code !== 200) {
            notify("Failed to update account: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        currentUser.value = <User>{
            ...currentUser.value,
            ...user
        };
        notify("Account updated", NotificationType.success);
        return true;
    }

    static async exportUser() {
        return await HttpClient.getAsync(ApiRoutes.exportUser);
    }

    static async getLibrary(name: string) {
        const res = await HttpClient.getAsync<Library>(ApiRoutes.getLibrary, { name });
        if (res.code !== 200) {
            notify("Failed to get library", NotificationType.error);
            return null;
        }
        return res.data as Library;
    }

    static async getRoyaltyInfo(): Promise<RoyaltyInfo|null> {
        const res = await HttpClient.getAsync<RoyaltyInfo>(ApiRoutes.getRoyaltyInfo);
        if (res.code !== 200) {
            notify("Failed to get library", NotificationType.error);
            return null;
        }
        return res.data;
    }

    //region Albums
    static async getAlbumsByUserId(userId: number): Promise<Album[]> {
        const res = await HttpClient.getAsync<Album[]>(ApiRoutes.getAlbumsByUserId, {id: userId});
        if (res.code !== 200) {
            console.error("Failed to get albums: ", res.data);
            return [];
        }
        return res.data;
    }

    static async createNewAlbum(album: Partial<Album>): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.newAlbum, album);
        if (res.code !== 200) {
            notify("Failed to create album: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        notify("Created album", NotificationType.success);
        return true;
    }

    static async deleteAlbum(id: number): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.deleteAlbum, {id});
        if (res.code !== 200) {
            notify("Error trying to delete album: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        notify("Successfully deleted album", NotificationType.success);
        return true;
    }

    static async addTrackToAlbums(track_id: number, album_ids: number[]): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.addTrackToAlbums, {album_ids, track_id});
        if (res.code !== 200) {
            notify("Failed to add track to albums: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        notify("Added track to albums", NotificationType.success);
        return true;
    }

    static async removeTrackFromAlbums(track_id: number, album_ids: number[]): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.removeTrackFromAlbums, {album_ids, track_id});
        if (res.code !== 200) {
            notify("Failed to remove track from album: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        notify("Removed track from album", NotificationType.success);
        return true;
    }

    static async moveTrackInAlbum(albumId: number, tracks: ListTrack[]): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.reorderAlbumTracks, {
            album_id: albumId,
            tracks
        });
        if (res.code !== 200) {
            notify("Failed to move tracks: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        return true;
    }
    //endregion

    //region Tracks
    static async savePlay(id: number, quality: string): Promise<any> {
        return await HttpClient.postAsync(ApiRoutes.saveTrackPlay, { id, quality });
    }

    static async unfollowUser(userId: number): Promise<any> {
        const res = await HttpClient.postAsync(ApiRoutes.unfollowUser, {
            id: userId
        });

        if (res.code !== 200) {
            notify("Error while trying to unfollow user: " + getErrorMessage(res), NotificationType.error);
        }

        return res;
    }

    static async deleteTrack(id: number): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.deleteTrack, { id });
        if (res.code !== 200) {
            notify("Error trying to delete track: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        notify(res.data, NotificationType.success);
        return true;
    }

    static async deleteComment(commentId: number): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.deleteComment, {
            id: commentId,
        });

        if (res.code !== 200) {
            notify(getErrorMessage(res), NotificationType.error);
            return false;
        }

        notify("Comment deleted", NotificationType.success);
        return true;
    }

    static async newComment(track_id: number, content: string, parentCommentId: number|null = null): Promise<number|null> {
        if (!content || content === "") {
            return null;
        }
        if (content.length > 1000) {
            notify("Comment is too long", NotificationType.error);
            return null;
        }

        const res = await HttpClient.postAsync(ApiRoutes.newComment, {
            id: track_id,
            content: content,
            parentId: parentCommentId ? parentCommentId : null,
        });

        if (res.code !== 200) {
            notify(getErrorMessage(res), NotificationType.error);
            return null;
        }

        return parseInt(res.data);
    }

    static async followUser(userId: number): Promise<any> {
        const res = await HttpClient.postAsync(ApiRoutes.followUser, {
            id: userId,
        });

        if (res.code !== 200) {
            notify("Error while trying to follow user: " + getErrorMessage(res), NotificationType.error);
        }

        return res;
    }

    static async getCollabTypes(): Promise<CollaboratorType[]> {
        const res = await HttpClient.getAsync<CollaboratorType[]>(ApiRoutes.getTrackCollabTypes);
        if (res.code !== 200) {
            notify("Error while trying to get collab types: " + getErrorMessage(res), NotificationType.error);
            return [];
        }
        return res.data as CollaboratorType[];
    }

    static async removeCollaboratorFromTrack(trackId: number, userId: number): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.removeCollaborator, {
            id: trackId,
            userId: userId,
        });

        if (res.code !== 200) {
            notify("Error while trying to remove collaborator: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        return true;
    }

    static async addCollaboratorToTrack(trackId: number, userId: number, collabType: number): Promise<TrackCollaborator|null> {
        const res = await HttpClient.postAsync<TrackCollaborator>(ApiRoutes.addCollaborator, {
            id: trackId,
            userId: userId,
            collabType: collabType,
        });

        if (res.code !== 200) {
            notify("Error while trying to add collaborator: " + getErrorMessage(res), NotificationType.error);
            return null;
        }

        return res.data;
    }

    static async getUnapprovedTracks(): Promise<any[]> {
        const res = await HttpClient.getAsync<any[]>(ApiRoutes.getUnapprovedCollabs);
        if (res.code !== 200) {
            notify("Error while trying to get unapproved tracks: " + getErrorMessage(res), NotificationType.error);
            return [];
        }
        return res.data;
    }

    static async approveCollab(id: number, name = "track"): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.approveCollab, {
            id: id,
        });
        if (res.code !== 200) {
            notify("Error while trying to approve collab: " + getErrorMessage(res), NotificationType.error);
            return false;
        }

        notify(`Collab on ${name} approved`, NotificationType.success);
        return true;
    }

    static async denyCollab(id: number, name = "track"): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.denyCollab, {
            id: id,
        });
        if (res.code !== 200) {
            notify("Error while trying to deny collab: " + getErrorMessage(res), NotificationType.error);
            return false;
        }

        notify(`Collab on ${name} denied`, NotificationType.success);
        return true;
    }

    static async getTrackById(id: number, code: string = ""): Promise<{
        track: Track,
        canEdit: boolean,
    }|null> {
        const res = await HttpClient.getAsync<{
            track: Track,
            canEdit: boolean,
        }>(ApiRoutes.getTrackById + `?id=${id}&code=${code}`);
        if (res.code !== 200) {
            notify("Error getting track: " + getErrorMessage(res), NotificationType.error);
            return null;
        }
        return res.data;
    }

    static async updateTrackFull(track: Partial<Track>): Promise<any> {
        const res = await HttpClient.postAsync(ApiRoutes.updateTrackFull, {
            id: track.id,
            title: track.title,
            collaborators: track.collaborators,
            artistname: track.artistname,
            description: track.description,
            genre: track.genre,
            release_date: track.release_date,
            visibility: track.visibility,
            isrc: track.isrc,
            upc: track.upc,
            price: track.price,
        });
        if (res.code !== 200) {
            notify("Error while trying to update track: " + getErrorMessage(res), NotificationType.error);
            return null;
        }

        return res.data;
    }
    //endregion

    //region Playlists
    static async getPlaylistById(id: number): Promise<{
        playlist: Playlist,
        canEdit: boolean,
    }|null> {
        const res = await HttpClient.getAsync<{
            playlist: Playlist,
            canEdit: boolean,
        }>(ApiRoutes.getPlaylistById + `?id=${id}`);
        if (res.code !== 200) {
            console.error("Failed to get playlist: ", res.data);
            return null;
        }
        return res.data;
    }

    static async getPlaylistsByUserId(userId: number): Promise<Playlist[]> {
        const res = await HttpClient.getAsync<Playlist[]>(ApiRoutes.getPlaylistsByUserId, {id: userId});
        if (res.code !== 200) {
            console.error("Failed to get playlists: ", res.data);
            return [];
        }
        return res.data;
    }

    static async createNewPlaylist(playlist: Partial<Playlist>): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.newPlaylist, playlist);
        if (res.code !== 200) {
            notify("Failed to create playlist: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        notify("Created playlist", NotificationType.success);
        return true;
    }

    static async deletePlaylist(id: number): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.deletePlaylist, {id});
        if (res.code !== 200) {
            notify("Error trying to delete playlist: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        notify("Successfully deleted playlist", NotificationType.success);
        return true;
    }

    static async addTrackToPlaylists(track_id: number, playlist_ids: number[]): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.addTrackToPlaylists, {
            playlist_ids,
            track_id
        });
        if (res.code !== 200) {
            notify("Failed to add track to playlists: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        notify("Added track to playlist(s)", NotificationType.success);
        return true;
    }

    static async removeTrackFromPlaylists(track_id: number, playlist_ids: number[]): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.removeTrackFromPlaylists, {playlist_ids, track_id});
        if (res.code !== 200) {
            notify("Failed to remove track from playlist: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        notify("Removed track from playlist", NotificationType.success);
        return true;
    }

    static async moveTrackInPlaylist(playlistId: number, tracks: ListTrack[]): Promise<boolean> {
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

    static async addAlbumToPlaylists(album_id: number, playlist_ids: number[]): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.addAlbumToPlaylists, {
            playlist_ids,
            album_id
        });
        if (res.code !== 200) {
            notify(getErrorMessage(res), NotificationType.error);
            return false;
        }
        notify("Added album to playlist(s)", NotificationType.success);
        return true;
    }
    //endregion
}
