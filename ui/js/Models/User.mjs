import { SearchHistory } from 'SearchHistory.mjs';
import { UsersLike } from 'UsersLike.mjs';
import { Video } from 'Video.mjs';
import { VideoView } from 'VideoView.mjs';
import { Image } from 'Image.mjs';
import { Recipe } from 'Recipe.mjs';
import { PaypalUser } from 'PaypalUser.mjs';
import { Notification } from 'Notification.mjs';
import { Subscription } from 'Subscription.mjs';
import { PaymentHistory } from 'PaymentHistory.mjs';
import { BillingHistory } from 'BillingHistory.mjs';
import { Addresse } from 'Addresse.mjs';
import { SoToken } from 'SoToken.mjs';
import { UserIpv6 } from 'UserIpv6.mjs';
import { MfaMail } from 'MfaMail.mjs';
import { UserIpv4 } from 'UserIpv4.mjs';
import { Session } from 'Session.mjs';
import { SessionValidation } from 'SessionValidation.mjs';
import { Usersetting } from 'Usersetting.mjs';
import { PublicKey } from 'PublicKey.mjs';
import { UsersPermission } from 'UsersPermission.mjs';
import { Playlistlike } from 'Playlistlike.mjs';
import { TrackCollaborator } from 'TrackCollaborator.mjs';
import { Music } from 'Music.mjs';
import { ActionLog } from 'ActionLog.mjs';
import { Listeninghistory } from 'Listeninghistory.mjs';
import { Follow } from 'Follow.mjs';
import { Tracklike } from 'Tracklike.mjs';
import { Repost } from 'Repost.mjs';
import { Playlisttrack } from 'Playlisttrack.mjs';
import { Albumtrack } from 'Albumtrack.mjs';
import { Comment } from 'Comment.mjs';
import { Theme } from 'Theme.mjs';
import { UserBadge } from 'UserBadge.mjs';
import { RoyaltyPayment } from 'RoyaltyPayment.mjs';
import { Albumlike } from 'Albumlike.mjs';
import { ArtistRoyaltie } from 'ArtistRoyaltie.mjs';
import { Album } from 'Album.mjs';
import { Playlist } from 'Playlist.mjs';
import { Context } from 'Context.mjs';
import { Issue } from 'Issue.mjs';
import { SupportMessage } from 'SupportMessage.mjs';
import { UserArtistLink } from 'UserArtistLink.mjs';
import { Artist } from 'Artist.mjs';
import { ReplyTemplate } from 'ReplyTemplate.mjs';

export class User {
    /** @var {number|null} id */
    id = null;
    /** @var {number|null} access */
    access = null;
    /** @var {string|null} username */
    username = null;
    /** @var {string|null} displayname */
    displayname = null;
    /** @var {string|null} description */
    description = null;
    /** @var {string|null} password */
    password = null;
    /** @var {string|null} subscription */
    subscription = null;
    /** @var {string|null} subscriptionId */
    subscriptionId = null;
    /** @var {string|null} verified */
    verified = null;
    /** @var {string|null} email */
    email = null;
    /** @var {string|null} activationCode */
    activationCode = null;
    /** @var {string|null} theme */
    theme = null;
    /** @var {string|null} trackview */
    trackview = null;
    /** @var {string|null} menuposition */
    menuposition = null;
    /** @var {string|null} avatar */
    avatar = null;
    /** @var {number|null} displayavatar */
    displayavatar = null;
    /** @var {string|null} header */
    header = null;
    /** @var {string|null} date */
    date = null;
    /** @var {string|null} time */
    time = null;
    /** @var {SearchHistory[]|null} searchHistory */
    searchHistory = null;
    /** @var {UsersLike[]|null} usersLikesUsers */
    usersLikesUsers = null;
    /** @var {Video[]|null} videosUsers */
    videosUsers = null;
    /** @var {VideoView[]|null} videoViewsUsers */
    videoViewsUsers = null;
    /** @var {Image[]|null} imagesUsers */
    imagesUsers = null;
    /** @var {Recipe[]|null} recipes */
    recipes = null;
    /** @var {PaypalUser[]|null} paypalUsers */
    paypalUsers = null;
    /** @var {Notification[]|null} notifications */
    notifications = null;
    /** @var {Subscription[]|null} subscriptions */
    subscriptions = null;
    /** @var {PaymentHistory[]|null} paymentHistory */
    paymentHistory = null;
    /** @var {BillingHistory[]|null} billingHistory */
    billingHistory = null;
    /** @var {Addresse[]|null} addresses */
    addresses = null;
    /** @var {SoToken[]|null} soTokens */
    soTokens = null;
    /** @var {UserIpv6[]|null} userIpv6 */
    userIpv6 = null;
    /** @var {MfaMail[]|null} mfaMail */
    mfaMail = null;
    /** @var {UserIpv4[]|null} userIpv4 */
    userIpv4 = null;
    /** @var {Session[]|null} sessions */
    sessions = null;
    /** @var {SessionValidation[]|null} sessionValidations */
    sessionValidations = null;
    /** @var {Usersetting[]|null} usersettings */
    usersettings = null;
    /** @var {PublicKey[]|null} publicKeys */
    publicKeys = null;
    /** @var {UsersPermission[]|null} usersPermissions */
    usersPermissions = null;
    /** @var {Playlistlike[]|null} playlistlikes */
    playlistlikes = null;
    /** @var {TrackCollaborator[]|null} trackCollaborators */
    trackCollaborators = null;
    /** @var {Music[]|null} music */
    music = null;
    /** @var {ActionLog[]|null} actionLog */
    actionLog = null;
    /** @var {Listeninghistory[]|null} listeninghistory */
    listeninghistory = null;
    /** @var {Follow[]|null} follows */
    follows = null;
    /** @var {Tracklike[]|null} tracklikes */
    tracklikes = null;
    /** @var {Repost[]|null} reposts */
    reposts = null;
    /** @var {Playlisttrack[]|null} playlisttracks */
    playlisttracks = null;
    /** @var {Albumtrack[]|null} albumtracks */
    albumtracks = null;
    /** @var {Comment[]|null} comments */
    comments = null;
    /** @var {Theme[]|null} themes */
    themes = null;
    /** @var {UserBadge[]|null} userBadges */
    userBadges = null;
    /** @var {RoyaltyPayment[]|null} royaltyPayments */
    royaltyPayments = null;
    /** @var {Albumlike[]|null} albumlikes */
    albumlikes = null;
    /** @var {ArtistRoyaltie[]|null} artistRoyalties */
    artistRoyalties = null;
    /** @var {Album[]|null} albums */
    albums = null;
    /** @var {Playlist[]|null} playlists */
    playlists = null;
    /** @var {Context[]|null} context */
    context = null;
    /** @var {Issue[]|null} issuesIbfk */
    issuesIbfk = null;
    /** @var {SupportMessage[]|null} supportMessagesIbfk */
    supportMessagesIbfk = null;
    /** @var {UserArtistLink[]|null} userArtistLink */
    userArtistLink = null;
    /** @var {Artist[]|null} artists */
    artists = null;
    /** @var {ReplyTemplate[]|null} replyTemplatesUsers */
    replyTemplatesUsers = null;
    constructor(data) {
        this.id = data.id;
        this.access = data.access;
        this.username = data.username;
        this.displayname = data.displayname;
        this.description = data.description;
        this.password = data.password;
        this.subscription = data.subscription;
        this.subscriptionId = data.subscriptionId;
        this.verified = data.verified;
        this.email = data.email;
        this.activationCode = data.activationCode;
        this.theme = data.theme;
        this.trackview = data.trackview;
        this.menuposition = data.menuposition;
        this.avatar = data.avatar;
        this.displayavatar = data.displayavatar;
        this.header = data.header;
        this.date = data.date;
        this.time = data.time;
        this.searchHistory = data.searchHistory;
        this.usersLikesUsers = data.usersLikesUsers;
        this.videosUsers = data.videosUsers;
        this.videoViewsUsers = data.videoViewsUsers;
        this.imagesUsers = data.imagesUsers;
        this.recipes = data.recipes;
        this.paypalUsers = data.paypalUsers;
        this.notifications = data.notifications;
        this.subscriptions = data.subscriptions;
        this.paymentHistory = data.paymentHistory;
        this.billingHistory = data.billingHistory;
        this.addresses = data.addresses;
        this.soTokens = data.soTokens;
        this.userIpv6 = data.userIpv6;
        this.mfaMail = data.mfaMail;
        this.userIpv4 = data.userIpv4;
        this.sessions = data.sessions;
        this.sessionValidations = data.sessionValidations;
        this.usersettings = data.usersettings;
        this.publicKeys = data.publicKeys;
        this.usersPermissions = data.usersPermissions;
        this.playlistlikes = data.playlistlikes;
        this.trackCollaborators = data.trackCollaborators;
        this.music = data.music;
        this.actionLog = data.actionLog;
        this.listeninghistory = data.listeninghistory;
        this.follows = data.follows;
        this.tracklikes = data.tracklikes;
        this.reposts = data.reposts;
        this.playlisttracks = data.playlisttracks;
        this.albumtracks = data.albumtracks;
        this.comments = data.comments;
        this.themes = data.themes;
        this.userBadges = data.userBadges;
        this.royaltyPayments = data.royaltyPayments;
        this.albumlikes = data.albumlikes;
        this.artistRoyalties = data.artistRoyalties;
        this.albums = data.albums;
        this.playlists = data.playlists;
        this.context = data.context;
        this.issuesIbfk = data.issuesIbfk;
        this.supportMessagesIbfk = data.supportMessagesIbfk;
        this.userArtistLink = data.userArtistLink;
        this.artists = data.artists;
        this.replyTemplatesUsers = data.replyTemplatesUsers;
    }
}