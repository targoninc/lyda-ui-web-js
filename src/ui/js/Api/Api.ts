import { HttpClient } from "./HttpClient.ts";
import { notify } from "../Classes/Ui.ts";
import { Signal } from "@targoninc/jess";
import { ApiRoutes } from "./ApiRoutes.ts";
import { currentUser } from "../state.ts";
import { getErrorMessage } from "../Classes/Util.ts";
import { Log } from "@targoninc/lyda-shared/src/Models/db/lyda/Log";
import { NotificationType } from "../Enums/NotificationType.ts";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { ListTrack } from "@targoninc/lyda-shared/src/Models/ListTrack";
import { Playlist } from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import { CollaboratorType } from "@targoninc/lyda-shared/src/Models/db/lyda/CollaboratorType";
import { TrackCollaborator } from "@targoninc/lyda-shared/src/Models/db/lyda/TrackCollaborator";
import { Library } from "@targoninc/lyda-shared/dist/Models/Library";
import { RoyaltyInfo } from "@targoninc/lyda-shared/src/Models/RoyaltyInfo";
import { get, post } from "./ApiClient.ts";
import { Notification } from "@targoninc/lyda-shared/src/Models/db/lyda/Notification.ts";
import { SearchResult } from "@targoninc/lyda-shared/src/Models/SearchResult";
import { navigate } from "../Routing/Router.ts";
import { RoutePath } from "../Routing/routes.ts";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";

export class Api {
    static getLogs(filterState: Signal<any>, successCallback: (data: Log[]) => void) {
        const errorText = "Failed to get logs";
        HttpClient.getAsync<Log[]>(ApiRoutes.getLogs, {
            logLevel: filterState.value,
            offset: 0,
            limit: 50,
        }).then(logs => {
            Api.handleResponse(logs, errorText, successCallback);
        });

        filterState.subscribe(async newValue => {
            HttpClient.getAsync<Log[]>(ApiRoutes.getLogs, {
                logLevel: newValue,
                offset: 0,
                limit: 100,
            }).then(logs => {
                Api.handleResponse(logs, errorText, successCallback);
            });
        });
    }

    static handleResponse(response: any, errorText: string, successCallback: (data: any) => void) {
        if (response.code !== 200) {
            notify(errorText, NotificationType.error);
            return;
        }
        successCallback(response.data);
    }

    //region User
    static async subscribe(parameters: Record<any, any>) {
        await post(ApiRoutes.subscribe, parameters);
    }

    static async unsubscribe(id: number) {
        await post(ApiRoutes.unsubscribe, { id });
    }

    static async updateUserSetting(setting: string, value: any) {
        await post(ApiRoutes.updateUserSetting, {
            setting, value
        })
    }

    static async verifyUser(id: number) {
        await post(ApiRoutes.verifyUser, { id })
    }

    static async unverifyUser(id: number) {
        await post(ApiRoutes.unverifyUser, { id })
    }

    static async getUsers(search: string) {
        return get<SearchResult[]>(ApiRoutes.searchUsers, { search });
    }

    static async getUser(name: string) {
        return get<User>(ApiRoutes.getUser, { name });
    }

    static async logout() {
        await post(ApiRoutes.logout);
        notify("Logged out!", NotificationType.success);
        navigate(RoutePath.login);
    }

    static async markNotificationsAsRead(newestTimestamp: Signal<Date | null>) {
        await post(ApiRoutes.markAllNotificationsAsRead, {
            newest: newestTimestamp.value,
        });
    }

    static async getNotifications(afterNotifId?: number) {
        if (afterNotifId) {
            return get<Notification[]>(ApiRoutes.getAllNotifications, { after: afterNotifId });
        } else {
            return get<Notification[]>(ApiRoutes.getAllNotifications);
        }
    }

    static async deleteUser() {
        return await HttpClient.postAsync(ApiRoutes.deleteUser);
    }

    static async updateUser(user: Partial<User>) {
        await post(ApiRoutes.updateUser, { user });
        currentUser.value = <User>{
            ...currentUser.value,
            ...user,
        };
        notify("Account updated", NotificationType.success);
        return true;
    }

    static async exportUser() {
        return await HttpClient.getAsync(ApiRoutes.exportUser);
    }

    static async getLibrary(name: string) {
        return await get<Library>(ApiRoutes.getLibrary, { name });
    }

    static async getRoyaltyInfo(): Promise<RoyaltyInfo | null> {
        return await get<RoyaltyInfo>(ApiRoutes.getRoyaltyInfo);
    }

    //endregion

    //region Albums
    static async getAlbumsByUserId(userId: number): Promise<Album[] | null> {
        return await get<Album[]>(ApiRoutes.getAlbumsByUserId, { id: userId });
    }

    static async createNewAlbum(album: Partial<Album>): Promise<boolean> {
        return !!(await post(ApiRoutes.newAlbum, album));
    }

    static async deleteAlbum(id: number): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.deleteAlbum, { id });
        if (res.code !== 200) {
            notify("Error trying to delete album: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        notify("Successfully deleted album", NotificationType.success);
        return true;
    }

    static async addTrackToAlbums(track_id: number, album_ids: number[]): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.addTrackToAlbums, { album_ids, track_id });
        if (res.code !== 200) {
            notify(
                "Failed to add track to albums: " + getErrorMessage(res),
                NotificationType.error
            );
            return false;
        }
        notify("Added track to albums", NotificationType.success);
        return true;
    }

    static async removeTrackFromAlbums(track_id: number, album_ids: number[]): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.removeTrackFromAlbums, {
            album_ids,
            track_id,
        });
        if (res.code !== 200) {
            notify(
                "Failed to remove track from album: " + getErrorMessage(res),
                NotificationType.error
            );
            return false;
        }
        notify("Removed track from album", NotificationType.success);
        return true;
    }

    static async moveTrackInAlbum(albumId: number, tracks: ListTrack[]): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.reorderAlbumTracks, {
            album_id: albumId,
            tracks,
        });
        if (res.code !== 200) {
            notify("Failed to move tracks: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        return true;
    }

    //endregion

    //region Tracks
    static async getNewAutoQueueTracks() {
        const response = await HttpClient.getAsync<any[]>(ApiRoutes.autoQueueFeed);
        return response.data;
    }

    static async savePlay(id: number, quality: string): Promise<any> {
        return await HttpClient.postAsync(ApiRoutes.saveTrackPlay, { id, quality });
    }

    static async unfollowUser(userId: number): Promise<any> {
        await post(ApiRoutes.unfollowUser, {
            id: userId,
        });
        notify("Unfollowed user", NotificationType.success);
        return true;
    }

    static async deleteTrack(id: number): Promise<boolean> {
        const res = await HttpClient.postAsync(ApiRoutes.deleteTrack, { id });
        if (res.code !== 200) {
            notify("Error trying to delete track: " + getErrorMessage(res), NotificationType.error);
            return false;
        }
        notify("Track deleted", NotificationType.success);
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

    static async newComment(
        track_id: number,
        content: string,
        parentCommentId: number | null = null
    ): Promise<number | null> {
        if (!content || content === "") {
            return null;
        }
        if (content.length > 1000) {
            notify("Comment is too long", NotificationType.error);
            return null;
        }

        return await post<number>(ApiRoutes.newComment, {
            id: track_id,
            content: content,
            parentId: parentCommentId ? parentCommentId : null,
        });
    }

    static async followUser(userId: number): Promise<any> {
        await post(ApiRoutes.followUser, {
            id: userId,
        });
        notify(`Successfully followed user`, NotificationType.success);
        return true;
    }

    static async getCollabTypes(): Promise<CollaboratorType[] | null> {
        return await get<CollaboratorType[]>(ApiRoutes.getTrackCollabTypes);
    }

    static async removeCollaboratorFromTrack(trackId: number, userId: number): Promise<boolean> {
        await post(ApiRoutes.removeCollaborator, {
            id: trackId,
            userId: userId,
        });
        notify("Removed collaborator from track", NotificationType.success);
        return true;
    }

    static async addCollaboratorToTrack(
        trackId: number,
        userId: number,
        collabType: number
    ): Promise<TrackCollaborator | null> {
        return await post<TrackCollaborator>(ApiRoutes.addCollaborator, {
            id: trackId,
            userId: userId,
            collabType: collabType,
        });
    }

    static async getUnapprovedTracks(): Promise<any[] | null> {
        return await get<any[]>(ApiRoutes.getUnapprovedCollabs);
    }

    static async approveCollab(id: number): Promise<boolean> {
        return !!(await post(ApiRoutes.approveCollab, { id }));
    }

    static async denyCollab(id: number, name = "track"): Promise<boolean> {
        await post(ApiRoutes.denyCollab, {
            id: id,
        });
        notify(`Collab on ${name} denied`, NotificationType.success);
        return true;
    }

    static async getTrackById(
        id: number,
        code: string = ""
    ): Promise<{
        track: Track;
        canEdit: boolean;
    } | null> {
        return await get<{
            track: Track;
            canEdit: boolean;
        }>(ApiRoutes.getTrackById, { id: id.toString(), code });
    }

    static async updateTrackFull(track: Partial<Track>): Promise<any> {
        await post(ApiRoutes.updateTrackFull, {
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
    }

    //endregion

    //region Playlists
    static async getPlaylistById(id: number): Promise<{
        playlist: Playlist;
        canEdit: boolean;
    } | null> {
        return await get<{
            playlist: Playlist;
            canEdit: boolean;
        }>(ApiRoutes.getPlaylistById, { id });
    }

    static async getPlaylistsByUserId(userId: number): Promise<Playlist[] | null> {
        return await get<Playlist[]>(ApiRoutes.getPlaylistsByUserId, {
            id: userId,
        });
    }

    static async createNewPlaylist(playlist: Partial<Playlist>): Promise<boolean> {
        await post(ApiRoutes.newPlaylist, playlist);
        notify("Created playlist", NotificationType.success);
        return true;
    }

    static async deletePlaylist(id: number): Promise<boolean> {
        await post(ApiRoutes.deletePlaylist, { id });
        notify("Successfully deleted playlist", NotificationType.success);
        return true;
    }

    static async addTrackToPlaylists(track_id: number, playlist_ids: number[]): Promise<boolean> {
        await post(ApiRoutes.addTrackToPlaylists, {
            playlist_ids,
            track_id,
        });
        notify("Added track to playlist(s)", NotificationType.success);
        return true;
    }

    static async removeTrackFromPlaylists(
        track_id: number,
        playlist_ids: number[]
    ): Promise<boolean> {
        await post(ApiRoutes.removeTrackFromPlaylists, {
            playlist_ids,
            track_id,
        });
        notify("Removed track from playlist", NotificationType.success);
        return true;
    }

    static async moveTrackInPlaylist(playlistId: number, tracks: ListTrack[]): Promise<boolean> {
        return !!(await post(ApiRoutes.reorderPlaylistTracks, {
            playlist_id: playlistId,
            tracks,
        }));
    }

    static async addAlbumToPlaylists(album_id: number, playlist_ids: number[]): Promise<boolean> {
        await post(ApiRoutes.addAlbumToPlaylists, {
            playlist_ids,
            album_id,
        });
        notify("Added album to playlist(s)", NotificationType.success);
        return true;
    }

    //endregion

    //region Comments
    static getModerationComments(
        filter: {
            potentiallyHarmful: boolean;
            user_id: number | null;
            offset: number;
            limit: number;
        },
        loading: Signal<boolean>,
        callback: (data: Comment[]) => Promise<void> | void
    ) {
        loading.value = true;
        get<Comment[]>(ApiRoutes.getModerationComments, filter).then(async res => {
            loading.value = false;
            if (res) {
                await callback(res);
            }
        });
    }

    static async setPotentiallyHarmful(id: number, v: boolean) {
        await post(ApiRoutes.setCommentPotentiallyHarmful, {
            id,
            potentiallyHarmful: v,
        });
    }

    static async setHidden(id: number, v: boolean) {
        await post(ApiRoutes.setCommentHidden, { id, hidden: v });
    }

    //endregion

    //region Media
    static async deleteMedia(type: MediaFileType, referenceId: number) {
        await post(ApiRoutes.deleteMedia, {
            type,
            referenceId
        });
    }
    //endregion
}
