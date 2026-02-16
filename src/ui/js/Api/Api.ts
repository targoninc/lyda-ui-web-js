import { notify } from "../Classes/Ui.ts";
import { Signal } from "@targoninc/jess";
import { ApiRoutes } from "./ApiRoutes.ts";
import { currentUser } from "../state.ts";
import { Log } from "@targoninc/lyda-shared/src/Models/db/lyda/Log";
import { NotificationType } from "../Enums/NotificationType.ts";
import { User } from "@targoninc/lyda-shared/src/Models/db/lyda/User";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { ListTrack } from "@targoninc/lyda-shared/src/Models/ListTrack";
import { Playlist } from "@targoninc/lyda-shared/src/Models/db/lyda/Playlist";
import { CollaboratorType } from "@targoninc/lyda-shared/src/Models/db/lyda/CollaboratorType";
import { TrackCollaborator } from "@targoninc/lyda-shared/src/Models/db/lyda/TrackCollaborator";
import { RoyaltyInfo } from "@targoninc/lyda-shared/src/Models/RoyaltyInfo";
import { get, post } from "./ApiClient.ts";
import { Notification } from "@targoninc/lyda-shared/src/Models/db/lyda/Notification.ts";
import { SearchResult } from "@targoninc/lyda-shared/src/Models/SearchResult";
import { navigate } from "../Routing/Router.ts";
import { RoutePath } from "../Routing/routes.ts";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";
import { WebauthnVerificationRequest } from "@targoninc/lyda-shared/dist/Models/WebauthnVerificationRequest";
import { AuthenticationJSON, CredentialDescriptor, RegistrationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { MfaOption } from "@targoninc/lyda-shared/src/Enums/MfaOption.ts";
import { UploadableTrack } from "../Models/UploadableTrack.ts";
import { InteractionType } from "@targoninc/lyda-shared/src/Enums/InteractionType";
import { EntityType } from "@targoninc/lyda-shared/src/Enums/EntityType.ts";
import { MonthIdentifier } from "../Classes/Helpers/Date.ts";
import { PaypalWebhook } from "@targoninc/lyda-shared/src/Models/db/finance/PaypalWebhook";
import { AvailableSubscription } from "@targoninc/lyda-shared/src/Models/db/finance/AvailableSubscription.ts";
import { Subscription } from "@targoninc/lyda-shared/src/Models/db/finance/Subscription.ts";
import { Statistic } from "@targoninc/lyda-shared/src/Models/Statistic";
import { TypedStatistic } from "@targoninc/lyda-shared/src/Models/TypedStatistic";
import { Payout } from "@targoninc/lyda-shared/src/Models/db/finance/Payout";
import { Permission } from "@targoninc/lyda-shared/src/Models/db/lyda/Permission.ts";
import { RoyaltyMonth } from "@targoninc/lyda-shared/src/Models/RoyaltyMonth";
import { ActionLog } from "@targoninc/lyda-shared/dist/Models/db/lyda/ActionLog";
import { Comment } from "@targoninc/lyda-shared/src/Models/db/lyda/Comment";
import { ModerationFilter } from "../Models/ModerationFilter.ts";
import { ClientError } from "@targoninc/lyda-shared/dist/Models/db/lyda/ClientError";
import { KeyValue } from "@targoninc/lyda-shared/dist/Models/KeyValue";
import { CreateOrderRequest } from "@targoninc/lyda-shared/src/Models/CreateOrderRequest";
import { CaptureOrderRequest } from "@targoninc/lyda-shared/src/Models/CaptureOrderRequest";
import { Transaction } from "@targoninc/lyda-shared/dist/Models/Transaction";
import { t } from "../../locales";
import { SubscriptionPayment } from "@targoninc/lyda-shared/dist/Models/db/finance/SubscriptionPayment";
import {ContentIDMatch} from "../Models/ContentIDMatch.ts";
import { TransactionInfo } from "@targoninc/lyda-shared/src/Models/TransactionInfo.ts";
import { TrackSale } from "@targoninc/lyda-shared/src/Models/db/lyda/TrackSale.ts";

export class Api {
    //region Interactions
    static async toggleInteraction(
        entityType: EntityType,
        interactionType: InteractionType,
        id: number,
        interacted$: Signal<boolean>
    ) {
        return post(ApiRoutes.toggleInteraction, {
            entityType,
            interactionType,
            id,
            toggle: !interacted$.value,
        });
    }

    static async removeAllInteractions(
        entityType: EntityType,
        interactionType: InteractionType
    ) {
        return post(ApiRoutes.removeAllInteractions, {
            entityType,
            interactionType,
        });
    }

    static async triggerEventHandling(eventId: string) {
        return post(ApiRoutes.triggerEventHandling, {
            id: eventId,
        });
    }

    static async getEvents(skip: number, filter: any = {}) {
        return get<PaypalWebhook[]>(ApiRoutes.getEvents, {
            skip,
            ...filter,
        });
    }

    static async retriggerContentID() {
        return post(ApiRoutes.retriggerContentID);
    }

    static async getContentIDMatches() {
        return get<ContentIDMatch[]>(ApiRoutes.contentIDMatches);
    }

    //endregion

    //region logs
    static async getActionLogs() {
        return get<ActionLog[]>(ApiRoutes.getActionLogs);
    }

    static async getLogs(filter: any) {
        return (await get<Log[]>(ApiRoutes.getLogs, {
            logLevel: filter,
            offset: 0,
            limit: 50,
        })) ?? [];
    }

    //endregion

    //region Royalties
    static async getPaymentHistory(skip: number, filter: any = {}) {
        return get<SubscriptionPayment[]>(ApiRoutes.getPaymentHistory, {
            skip,
            ...filter,
        });
    }

    static async getPayouts(skip: number, filter: any = {}) {
        return get<Payout[]>(ApiRoutes.getPayouts, {
            skip,
            ...filter,
        });
    }

    static async getTransactions(skip: number, filter: any = {}) {
        return get<Transaction[]>(ApiRoutes.getTransactions, {
            skip,
            ...filter,
        });
    }

    static async getGlobalTransactionInfo() {
        return get<TransactionInfo>(ApiRoutes.getGlobalTransactionInfo);
    }

    static async calculateRoyalties(month: MonthIdentifier) {
        return post(ApiRoutes.calculateRoyalties, {
            month: month.month,
            year: month.year,
        });
    }

    static async setRoyaltyActivation(month: MonthIdentifier, approved: boolean) {
        return post(ApiRoutes.setRoyaltyActivation, {
            month: month.month,
            year: month.year,
            approved,
        });
    }

    static async getRoyaltiesForExport(month: MonthIdentifier, type: string) {
        return get<string>(ApiRoutes.royaltiesForExport, {
            ...month,
            type,
        });
    }

    static async requestPayout() {
        return post(ApiRoutes.requestPayout);
    }

    //endregion

    //region Statistics
    static async getStatistic(
        endpoint: string,
        params: any = {},
        offset: number = 0,
        limit: number = 100
    ) {
        return get<Statistic[]>(endpoint, {
            ...params,
            offset,
            limit,
        });
    }

    static async getTypedStatistic(endpoint: string) {
        return get<TypedStatistic[]>(endpoint);
    }

    //endregion

    //region Auth
    static async login(email: string, password: string, challenge: string | undefined) {
        return post<{ user: User } | null>(ApiRoutes.login, {
            email,
            password,
            challenge,
        });
    }

    static async logout() {
        await post(ApiRoutes.logout);
        notify("Logged out!", NotificationType.success);
        navigate(RoutePath.login);
    }

    static async register(username: string, displayname: string, email: string, password: string) {
        await post(ApiRoutes.register, {
            username,
            displayname,
            email,
            password,
        });
    }

    static async verifyEmail(code: string) {
        await post(ApiRoutes.verifyEmail, {
            activationCode: code,
        });
    }

    static async requestPasswordReset(email: string): Promise<any> {
        return post(ApiRoutes.requestPasswordReset, {
            email,
        });
    }

    static async resetPassword(
        token: string,
        newPassword: string,
        newPasswordConfirm: string
    ): Promise<any> {
        return post(ApiRoutes.resetPassword, {
            token,
            newPassword,
            newPasswordConfirm,
        });
    }

    static async sendActivationEmail() {
        return post(ApiRoutes.sendActivationEmail);
    }

    static async verifyTotp(userId: number, token: string, type?: string) {
        return await post(ApiRoutes.verifyTotp, {
            userId,
            token,
            type,
        });
    }

    static async deleteTotpMethod(id: number, token: string) {
        return await post(ApiRoutes.deleteTotp, {
            id,
            token,
        });
    }

    static addTotpMethod(name: string) {
        return post<{
            secret: string;
            qrDataUrl: string;
        }>(ApiRoutes.addTotp, {
            name,
        });
    }

    static getWebauthnChallenge() {
        return post<WebauthnVerificationRequest>(ApiRoutes.challengeWebauthn);
    }

    static registerWebauthnMethod(registration: RegistrationJSON, challenge: string, name: string) {
        return post(ApiRoutes.registerWebauthn, {
            registration,
            challenge,
            name,
        });
    }

    static verifyWebauthn(json: AuthenticationJSON, challenge: string) {
        return post(ApiRoutes.verifyWebauthn, {
            verification: json,
            challenge,
        });
    }

    static async deleteWebauthnMethod(key_id: string, challenge: string) {
        return await post(ApiRoutes.deleteWebauthn, {
            key_id,
            challenge,
        });
    }

    static async getMfaOptions(email: string, password: string) {
        return await post<{
            userId: number;
            options: { type: MfaOption }[];
        }>(ApiRoutes.mfaOptions, {
            email,
            password,
        });
    }

    static mfaRequest(email: string, password: string, method: MfaOption) {
        return post<{
            mfa_needed: boolean;
            type?: MfaOption;
            credentialDescriptors?: CredentialDescriptor[];
            userId?: number;
            user?: User;
        }>(ApiRoutes.requestMfaCode, {
            email,
            password,
            method,
        });
    }

    //endregion

    //region Subscription
    static async getSubscriptionOptions() {
        return get<{
            options: AvailableSubscription[];
            currentSubscription: Subscription | null;
        }>(ApiRoutes.getSubscriptionOptions);
    }

    static async subscribe(parameters: Record<any, any>) {
        await post(ApiRoutes.subscribe, parameters);
    }

    static async unsubscribe(id: number) {
        await post(ApiRoutes.unsubscribe, { id });
    }

    //endregion

    //region User
    static async getPermissions() {
        return get<Permission[]>(ApiRoutes.userPermissions);
    }

    static async userExists(email: string) {
        return get<User>(ApiRoutes.userExists, {
            email: encodeURIComponent(email),
        });
    }

    static async setUserPermission(userId: number, permissionName: string, has: boolean) {
        return post(ApiRoutes.setUserPermission, {
            permissionName,
            user_id: userId,
            userHasPermission: has,
        });
    }

    static async updateUserSetting(setting: string, value: any) {
        await post(ApiRoutes.updateUserSetting, {
            setting,
            value,
        });
    }

    static async verifyUser(id: number) {
        await post(ApiRoutes.verifyUser, { id });
    }

    static async unverifyUser(id: number) {
        await post(ApiRoutes.unverifyUser, { id });
    }

    static async searchUsers(search: string) {
        return get<SearchResult[]>(ApiRoutes.searchUsers, { search });
    }

    static async getUsers(query: string, offset: number = 0, limit = 100) {
        return get<User[]>(ApiRoutes.getUsers, {
            query,
            offset,
            limit,
        });
    }

    static async getUserByName(name: string) {
        return get<User>(ApiRoutes.getUser, { name });
    }

    static async getUserById(id: number | null = null) {
        return get<User>(ApiRoutes.getUser, { id });
    }

    static async getRandomUser() {
        return get<User>(ApiRoutes.randomUser);
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
        return await post(ApiRoutes.deleteUser);
    }

    static async undeleteUser() {
        return await post(ApiRoutes.undeleteUser);
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
        return await get(ApiRoutes.exportUser);
    }

    static async getRoyaltyInfo(): Promise<RoyaltyInfo | null> {
        return await get<RoyaltyInfo>(ApiRoutes.getRoyaltyInfo);
    }

    static async getRoyaltyCalculationInfo(month: MonthIdentifier): Promise<Partial<RoyaltyMonth> | null> {
        return await get<Partial<RoyaltyMonth>>(ApiRoutes.getRoyaltyCalculationInfo, {
            month: month.month,
            year: month.year,
        });
    }

    static async trackClientError(error: ClientError) {
        await post(ApiRoutes.trackClientError, error);
    }

    static async getUserCache(): Promise<KeyValue[] | null> {
        return await get<KeyValue[]>(ApiRoutes.getUserCache);
    }

    static async setCacheKey(key: string, value: string) {
        await post(ApiRoutes.updateCacheKey, { key, value });
    }

    //endregion

    //region Albums
    static async getAlbumById(id: number) {
        return get<{ album: Album, canEdit: boolean }>(ApiRoutes.getAlbumById, { id });
    }

    static async updateAlbum(album: Partial<Album>) {
        return post(ApiRoutes.updateAlbum, album);
    }

    static async getAlbumsByUserId(userId: number, name: string = "", offset: number = 0, filter: string = ""): Promise<Album[] | null> {
        return await get<Album[]>(ApiRoutes.getAlbumsByUserId, {
            id: userId,
            name,
            offset,
            filter,
        });
    }

    static async getLikedAlbums(userId: number, name: string = "", offset: number = 0, filter: string = ""): Promise<Album[] | null> {
        return await get<Album[]>(ApiRoutes.likedAlbumsFeed, {
            id: userId,
            name,
            offset,
            filter,
        });
    }

    static async createNewAlbum(album: Partial<Album>) {
        await post(ApiRoutes.newAlbum, album);
        notify(t("ALBUM_CREATED"), NotificationType.success);
    }

    static async deleteAlbum(id: number): Promise<boolean> {
        await post(ApiRoutes.deleteAlbum, { id });
        notify(t("ALBUM_DELETED"), NotificationType.success);
        return true;
    }

    static async addTrackToAlbums(track_id: number, album_ids: number[]): Promise<boolean> {
        await post(ApiRoutes.addTrackToAlbums, { album_ids, track_id });
        notify(t("TRACK_ADDED_TO_ALBUMS"), NotificationType.success);
        return true;
    }

    static async removeTrackFromAlbums(track_id: number, album_ids: number[]): Promise<boolean> {
        await post(ApiRoutes.removeTrackFromAlbums, {
            album_ids,
            track_id,
        });
        notify(t("TRACK_REMOVED_FROM_ALBUMS"), NotificationType.success);
        return true;
    }

    static async moveTrackInAlbum(albumId: number, tracks: ListTrack[]): Promise<boolean> {
        await post(ApiRoutes.reorderAlbumTracks, {
            album_id: albumId,
            tracks,
        });
        return true;
    }

    //endregion

    //region Tracks
    static async getFeed(endpoint: string, params: any = {}) {
        return get<Track[]>(endpoint, params);
    }

    static async getTracksByUser(name: string, id: number | null = null) {
        return get<Track[]>(ApiRoutes.profileTracksFeed, {
            id,
            name,
            offset: 0,
            limit: 100,
        });
    }

    static async createTrack(track: UploadableTrack): Promise<Track | null> {
        return await post<Track>(ApiRoutes.createTrack, <Partial<Track>>{
            title: track.title,
            isrc: track.isrc,
            upc: track.upc,
            artistname: track.artistname,
            visibility: track.visibility,
            collaborators: track.collaborators,
            credits: track.credits,
            release_date: track.release_date,
            genre: track.genre,
            description: track.description,
            price: track.price,
        });
    }

    static async getNewAutoQueueTracks() {
        return (await get<any[]>(ApiRoutes.autoQueueFeed)) ?? [];
    }

    static async savePlay(id: number, quality: string): Promise<any> {
        return await post(ApiRoutes.saveTrackPlay, { id, quality });
    }

    static async unfollowUser(userId: number): Promise<any> {
        await post(ApiRoutes.unfollowUser, {
            id: userId,
        });
        notify("Unfollowed user", NotificationType.success);
        return true;
    }

    static async deleteTrack(id: number): Promise<boolean> {
        await post(ApiRoutes.deleteTrack, { id });
        notify("Track deleted", NotificationType.success);
        return true;
    }

    static async deleteComment(commentId: number): Promise<boolean> {
        await post(ApiRoutes.deleteComment, {
            id: commentId,
        });
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

    static async approveCollab(id: number) {
        return await post(ApiRoutes.approveCollab, { id });
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

    static async getTrackBuyers(id: number, offset: number = 0, limit: number = 100) {
        return await get<TrackSale[]>(ApiRoutes.getTrackBuyers, {
            id,
            offset,
            limit,
        });
    }

    //endregion

    //region Playlists
    static async getPlaylistsByUser(name: string, id: number | null = null) {
        return get<Playlist[]>(ApiRoutes.getPlaylistsByUserId, {
            id,
            name,
        });
    }

    static async getPlaylistById(id: number): Promise<{
        playlist: Playlist;
        canEdit: boolean;
    } | null> {
        return await get<{
            playlist: Playlist;
            canEdit: boolean;
        }>(ApiRoutes.getPlaylistById, { id });
    }

    static async getPlaylistsByUserId(userId: number, name: string = "", offset: number = 0, filter: string = ""): Promise<Playlist[] | null> {
        return await get<Playlist[]>(ApiRoutes.getPlaylistsByUserId, {
            id: userId,
            name,
            offset,
            filter,
        });
    }

    static async getLikedPlaylists(userId: number, name: string = "", offset: number = 0, filter: string = ""): Promise<Playlist[] | null> {
        return await get<Playlist[]>(ApiRoutes.likedPlaylistsFeed, {
            id: userId,
            name,
            offset,
            filter,
        });
    }

    static async createNewPlaylist(playlist: Partial<Playlist>): Promise<boolean> {
        await post(ApiRoutes.newPlaylist, playlist);
        notify(t("PLAYLIST_CREATED"), NotificationType.success);
        return true;
    }

    static async deletePlaylist(id: number): Promise<boolean> {
        await post(ApiRoutes.deletePlaylist, { id });
        notify(t("PLAYLIST_DELETED"), NotificationType.success);
        return true;
    }

    static async addTrackToPlaylists(track_id: number, playlist_ids: number[]): Promise<boolean> {
        await post(ApiRoutes.addTrackToPlaylists, {
            playlist_ids,
            track_id,
        });
        notify(t("TRACK_ADDED_TO_PLAYLISTS"), NotificationType.success);
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
        notify(t("TRACK_REMOVED_FROM_PLAYLISTS"), NotificationType.success);
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
        notify(t("ALBUM_ADDED_TO_PLAYLISTS"), NotificationType.success);
        return true;
    }

    //endregion

    //region Comments
    static async getModerationComments(
        filter: ModerationFilter,
        loading: Signal<boolean>,
    ) {
        loading.value = true;
        const res = await get<Comment[]>(ApiRoutes.getModerationComments, filter);
        loading.value = false;
        return res;
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
            referenceId,
        });
    }

    /**
     * Will only be called when directly downloading tracks, which is why we're requesting source quality
     * @param id
     */
    static async getTrackAudio(id: number) {
        return await get<Blob>(ApiRoutes.getTrackAudio, {
            id,
            quality: "source",
            download: true,
        });
    }

    //endregion

    // region Orders
    static async createOrder(request: CreateOrderRequest) {
        return await post<string>(ApiRoutes.createOrder, request);
    }

    static async captureOrder(request: CaptureOrderRequest) {
        return await post<string>(ApiRoutes.captureOrder, request);
    }

    // endregion
}
