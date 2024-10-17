import { Album } from 'src/ui/js/Models/Album.mjs';
import { Music } from 'src/ui/js/Models/Music.mjs';
import { User } from 'src/ui/js/Models/User.mjs';

export class Albumtrack {
    /** @var {number} albumId */
    albumId;
    /** @var {number} trackId */
    trackId;
    /** @var {number} userId */
    userId;
    /** @var {number} position */
    position;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {Album|null} album */
    album = null;
    /** @var {Music|null} music */
    music = null;
    /** @var {User|null} user */
    user = null;
    constructor(data) {
        this.albumId = data.albumId;
        this.trackId = data.trackId;
        this.userId = data.userId;
        this.position = data.position;
        this.createdAt = data.createdAt;
        this.albums = data.albums;
        this.music = data.music;
        this.users = data.users;
    }
}