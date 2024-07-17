import { User } from 'User.mjs';
import { Albumtrack } from 'Albumtrack.mjs';
import { Albumlike } from 'Albumlike.mjs';
import { Track } from 'Track.mjs';

export class Album {
    /** @var {number} id */
    id;
    /** @var {number} userId */
    userId;
    /** @var {string} name */
    name;
    /** @var {string|null} description */
    description = null;
    /** @var {string|null} upc */
    upc = null;
    /** @var {Date} releaseDate */
    releaseDate;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {Date} updatedAt */
    updatedAt;
    /** @var {string} visibility */
    visibility;
    /** @var {string|null} secretcode */
    secretcode = null;
    /** @var {number|null} price */
    price = null;
    /** @var {User|null} user */
    user = null;
    /** @var {Albumtrack[]|null} albumtracks */
    albumtracks = null;
    /** @var {Albumlike[]|null} albumlikes */
    albumlikes = null;
    /** @var {Track[]|null} tracksAlbums */
    tracksAlbums = null;
    constructor(data) {
        this.id = data.id;
        this.userId = data.userId;
        this.name = data.name;
        this.description = data.description;
        this.upc = data.upc;
        this.releaseDate = data.releaseDate;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.visibility = data.visibility;
        this.secretcode = data.secretcode;
        this.price = data.price;
        this.users = data.users;
        this.albumtracks = data.albumtracks;
        this.albumlikes = data.albumlikes;
        this.tracksAlbums = data.tracksAlbums;
    }
}