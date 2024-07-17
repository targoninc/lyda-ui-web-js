import { User } from 'User.mjs';
import { Playlistlike } from 'Playlistlike.mjs';
import { Playlisttrack } from 'Playlisttrack.mjs';

export class Playlist {
    /** @var {number} id */
    id;
    /** @var {number} userId */
    userId;
    /** @var {string|null} name */
    name = null;
    /** @var {string|null} description */
    description = null;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {Date} updatedAt */
    updatedAt;
    /** @var {string} visibility */
    visibility;
    /** @var {string|null} secretcode */
    secretcode = null;
    /** @var {User|null} user */
    user = null;
    /** @var {Playlistlike[]|null} playlistlikes */
    playlistlikes = null;
    /** @var {Playlisttrack[]|null} playlisttracks */
    playlisttracks = null;
    constructor(data) {
        this.id = data.id;
        this.userId = data.userId;
        this.name = data.name;
        this.description = data.description;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.visibility = data.visibility;
        this.secretcode = data.secretcode;
        this.users = data.users;
        this.playlistlikes = data.playlistlikes;
        this.playlisttracks = data.playlisttracks;
    }
}