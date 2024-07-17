import { User } from 'User.mjs';
import { TrackCollaborator } from 'TrackCollaborator.mjs';
import { Notification } from 'Notification.mjs';
import { Listeninghistory } from 'Listeninghistory.mjs';
import { Tracklike } from 'Tracklike.mjs';
import { Repost } from 'Repost.mjs';
import { Playlisttrack } from 'Playlisttrack.mjs';
import { Albumtrack } from 'Albumtrack.mjs';
import { Comment } from 'Comment.mjs';
import { AnalyzedFrequencyRatio } from 'AnalyzedFrequencyRatio.mjs';
import { TrackRoyaltie } from 'TrackRoyaltie.mjs';

export class Music {
    /** @var {number} id */
    id;
    /** @var {number} userId */
    userId;
    /** @var {string} title */
    title;
    /** @var {string|null} isrc */
    isrc = null;
    /** @var {string|null} upc */
    upc = null;
    /** @var {string|null} visibility */
    visibility = null;
    /** @var {string|null} collaborators */
    collaborators = null;
    /** @var {string|null} loudnessData */
    loudnessData = null;
    /** @var {string|null} genre */
    genre = null;
    /** @var {string|null} version */
    version = null;
    /** @var {number|null} versionid */
    versionid = null;
    /** @var {number} length */
    length;
    /** @var {string|null} description */
    description = null;
    /** @var {Date|null} releaseDate */
    releaseDate = null;
    /** @var {Date} updatedAt */
    updatedAt;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {number|null} plays */
    plays = null;
    /** @var {string|null} secretcode */
    secretcode = null;
    /** @var {boolean} hasAudio */
    hasAudio;
    /** @var {boolean} monetization */
    monetization;
    /** @var {string|null} extension */
    extension = null;
    /** @var {string|null} filename */
    filename = null;
    /** @var {number|null} price */
    price = null;
    /** @var {boolean} processed */
    processed;
    /** @var {User|null} user */
    user = null;
    /** @var {TrackCollaborator[]|null} trackCollaborators */
    trackCollaborators = null;
    /** @var {Notification[]|null} notifications */
    notifications = null;
    /** @var {Listeninghistory[]|null} listeninghistory */
    listeninghistory = null;
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
    /** @var {AnalyzedFrequencyRatio[]|null} analyzedFrequencyRatios */
    analyzedFrequencyRatios = null;
    /** @var {TrackRoyaltie[]|null} trackRoyalties */
    trackRoyalties = null;
    constructor(data) {
        this.id = data.id;
        this.userId = data.userId;
        this.title = data.title;
        this.isrc = data.isrc;
        this.upc = data.upc;
        this.visibility = data.visibility;
        this.collaborators = data.collaborators;
        this.loudnessData = data.loudnessData;
        this.genre = data.genre;
        this.version = data.version;
        this.versionid = data.versionid;
        this.length = data.length;
        this.description = data.description;
        this.releaseDate = data.releaseDate;
        this.updatedAt = data.updatedAt;
        this.createdAt = data.createdAt;
        this.plays = data.plays;
        this.secretcode = data.secretcode;
        this.hasAudio = data.hasAudio;
        this.monetization = data.monetization;
        this.extension = data.extension;
        this.filename = data.filename;
        this.price = data.price;
        this.processed = data.processed;
        this.users = data.users;
        this.trackCollaborators = data.trackCollaborators;
        this.notifications = data.notifications;
        this.listeninghistory = data.listeninghistory;
        this.tracklikes = data.tracklikes;
        this.reposts = data.reposts;
        this.playlisttracks = data.playlisttracks;
        this.albumtracks = data.albumtracks;
        this.comments = data.comments;
        this.analyzedFrequencyRatios = data.analyzedFrequencyRatios;
        this.trackRoyalties = data.trackRoyalties;
    }
}