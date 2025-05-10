import {Config} from "../Classes/Config.ts";

export class ApiRoutes {
    static base = Config.apiBaseUrl;
    // region Audit
    private static audit = ApiRoutes.base + "/audit";
    static getLogs = ApiRoutes.audit + "/logs";
    static getActionLogs = ApiRoutes.audit + "/actionLogs";
    // endregion

    // region User
    static getUsers = ApiRoutes.base + "/users";

    private static user = ApiRoutes.base + "/user";
    static getUser = ApiRoutes.user + "/get";
    static userSettings = ApiRoutes.user + "/settings";
    static userPermissions = ApiRoutes.user + "/permissions";
    static randomUser = ApiRoutes.user + "/random";
    static userExists = ApiRoutes.user + "/exists";
    static getLibrary = ApiRoutes.user + "/library";
    static exportUser = ApiRoutes.user + "/export";

    private static userActions = ApiRoutes.user + "/actions";
    static followUser = ApiRoutes.userActions + "/follow";
    static unfollowUser = ApiRoutes.userActions + "/unfollow";
    static verifyUser = ApiRoutes.userActions + "/verify";
    static unverifyUser = ApiRoutes.userActions + "/unverify";
    static requestVerification = ApiRoutes.userActions + "/requestVerification";
    static login = ApiRoutes.userActions + "/login";
    static logout = ApiRoutes.userActions + "/logout";
    static register = ApiRoutes.userActions + "/register";
    static requestMfaCode = ApiRoutes.userActions + "/mfa-request";
    static updateUserSetting = ApiRoutes.userActions + "/update-setting";
    static requestPasswordReset = ApiRoutes.userActions + "/request-password-reset";
    static resetPassword = ApiRoutes.userActions + "/reset-password";
    static updateUser = ApiRoutes.userActions + "/update";
    static verifyEmail = ApiRoutes.userActions + "/verify-email";
    static deleteUser = ApiRoutes.userActions + "/delete";
    static sendActivationEmail = ApiRoutes.userActions + "/send-activation-email";
    static setUserPermission = ApiRoutes.userActions + "/set-permission";
    // endregion

    // region Subscriptions
    private static subscriptions = ApiRoutes.base + "/subscriptions";
    static getSubscriptionOptions = ApiRoutes.subscriptions + "/options";
    static getPaymentHistory = ApiRoutes.subscriptions + "/payments";

    private static subscriptionActions = ApiRoutes.subscriptions + "/actions";
    static subscribe = ApiRoutes.subscriptionActions + "/subscribe";
    static unsubscribe = ApiRoutes.subscriptionActions + "/unsubscribe";
    // endregion

    // region Media
    private static media = ApiRoutes.base + "/media";
    static uploadMedia = ApiRoutes.media + "/upload";
    static deleteMedia = ApiRoutes.media + "/delete";
    static getImageMedia = ApiRoutes.media + "/image";
    // endregion

    // region Notifications
    private static notifications = ApiRoutes.base + "/notifications";
    static getAllNotifications = ApiRoutes.notifications + "/get";
    static markAllNotificationsAsRead = ApiRoutes.notifications + "/actions/markAllAsRead";
    // endregion

    // region Tracks
    private static tracks = ApiRoutes.base + "/tracks";
    static getTrackById = ApiRoutes.tracks + "/byId";
    static getTrackByUserId = ApiRoutes.tracks + "/byUserId";
    static getTrackAudio = ApiRoutes.tracks + "/audio";
    static getTrackCollabTypes = ApiRoutes.tracks + "/collabTypes";
    static getUnapprovedCollabs = ApiRoutes.tracks + "/unapprovedCollabs";
    static createTrack = ApiRoutes.tracks + "/create";
    static getRepostsByUserId = ApiRoutes.tracks + "/repostsByUserId";

    private static tracksActions = ApiRoutes.tracks + "/actions";
    static likeTrack = ApiRoutes.tracksActions + "/like";
    static unlikeTrack = ApiRoutes.tracksActions + "/unlike";
    static repostTrack = ApiRoutes.tracksActions + "/repost";
    static unrepostTrack = ApiRoutes.tracksActions + "/unrepost";
    static deleteTrack = ApiRoutes.tracksActions + "/delete";
    static updateTrack = ApiRoutes.tracksActions + "/update";
    static updateTrackFull = ApiRoutes.tracksActions + "/updateFull";
    static saveTrackPlay = ApiRoutes.tracksActions + "/savePlay";
    static removeCollaborator = ApiRoutes.tracksActions + "/removeCollaborator";
    static addCollaborator = ApiRoutes.tracksActions + "/addCollaborator";
    static approveCollab = ApiRoutes.tracksActions + "/approveCollab";
    static denyCollab = ApiRoutes.tracksActions + "/denyCollab";

    private static feeds = ApiRoutes.tracks + "/feeds";
    static followingFeed = ApiRoutes.feeds + "/following";
    static exploreFeed = ApiRoutes.feeds + "/explore";
    static historyFeed = ApiRoutes.feeds + "/history";
    static autoQueueFeed = ApiRoutes.feeds + "/autoQueue";
    // endregion

    // region Albums
    private static albums = ApiRoutes.base + "/albums";
    static getAlbumById = ApiRoutes.albums + "/byId";
    static getAlbumsByUserId = ApiRoutes.albums + "/byUserId";

    private static albumActions = ApiRoutes.albums + "/actions";
    static newAlbum = ApiRoutes.albumActions + "/new";
    static updateAlbum = ApiRoutes.albumActions + "/update";
    static deleteAlbum = ApiRoutes.albumActions + "/delete";
    static addTrackToAlbums = ApiRoutes.albumActions + "/addTrack";
    static removeTrackFromAlbums = ApiRoutes.albumActions + "/removeTrack";
    static reorderAlbumTracks = ApiRoutes.albumActions + "/reorderTracks";
    static likeAlbum = ApiRoutes.albumActions + "/like";
    static unlikeAlbum = ApiRoutes.albumActions + "/unlike";
    // endregion

    // region Playlists
    private static playlists = ApiRoutes.base + "/playlists";
    static getPlaylistById = ApiRoutes.playlists + "/byId";
    static getPlaylistsByUserId = ApiRoutes.playlists + "/byUserId";

    private static playlistActions = ApiRoutes.playlists + "/actions";
    static newPlaylist = ApiRoutes.playlistActions + "/new";
    static deletePlaylist = ApiRoutes.playlistActions + "/delete";
    static addTrackToPlaylists = ApiRoutes.playlistActions + "/addTrack";
    static addAlbumToPlaylists = ApiRoutes.playlistActions + "/addAlbum";
    static removeTrackFromPlaylists = ApiRoutes.playlistActions + "/removeTrack";
    static reorderPlaylistTracks = ApiRoutes.playlistActions + "/reorderTracks";
    static likePlaylist = ApiRoutes.playlistActions + "/like";
    static unlikePlaylist = ApiRoutes.playlistActions + "/unlike";
    // endregion

    // region Comments
    private static comments = ApiRoutes.base + "/comments";
    static getModerationComments = ApiRoutes.comments + "/get";
    static getCommentsByTrackId = ApiRoutes.comments + "/byTrackId";

    private static commentActions = ApiRoutes.comments + "/actions";
    static newComment = ApiRoutes.commentActions + "/new";
    static deleteComment = ApiRoutes.commentActions + "/delete";
    static setCommentPotentiallyHarmful = ApiRoutes.commentActions + "/setPotentiallyHarmful";
    static setCommentHidden = ApiRoutes.commentActions + "/setHidden";
    // endregion

    // region Statistics
    private static statistics = ApiRoutes.base + "/statistics";
    static getPlayCountByTrack = ApiRoutes.statistics + "/playCountByTrack";
    static getPlayCountByMonth = ApiRoutes.statistics + "/playCountByMonth";
    static getLikesByTrack = ApiRoutes.statistics + "/likesByTrack";
    static getRoyaltiesByMonth = ApiRoutes.statistics + "/royaltiesByMonth";
    static getRoyaltiesByTrack = ApiRoutes.statistics + "/royaltiesByTrack";
    static getActivityByTime = ApiRoutes.statistics + "/activityByTime";
    // endregion

    // region Royalties
    static getPayments = ApiRoutes.base + "/payments";

    private static royalties = ApiRoutes.base + "/royalties";
    static getRoyaltyInfo = ApiRoutes.royalties + "/info";
    static requestPayout = ApiRoutes.royalties + "/requestPayout";
    static calculateEarnings = ApiRoutes.royalties + "/calculateEarnings";
    static calculateRoyalties = ApiRoutes.royalties + "/calculate";
    static setRoyaltyActivation = ApiRoutes.royalties + "/setActivation";
    static royaltiesForExport = ApiRoutes.royalties + "/export";
    // endregion

    // region Search
    private static search = ApiRoutes.base + "/search";
    static searchTracks = ApiRoutes.search + "/tracks";
    static searchAlbums = ApiRoutes.search + "/albums";
    static searchPlaylists = ApiRoutes.search + "/playlists";
    static searchUsers = ApiRoutes.search + "/users";
    // endregion

    // region Webhooks
    private static webhooks = ApiRoutes.base + "/webhooks";
    static getEvents = ApiRoutes.webhooks + "/events";
    static triggerEventHandling = ApiRoutes.webhooks + "/triggerEventHandling";
    // endregion
}