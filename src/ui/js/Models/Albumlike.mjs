import { Album } from 'src/ui/js/Models/Album.mjs';
import { User } from 'src/ui/js/Models/User.mjs';

export class Albumlike {
    /** @var {number} userId */
    userId;
    /** @var {number} albumId */
    albumId;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {Album|null} album */
    album = null;
    /** @var {User|null} user */
    user = null;
    constructor(data) {
        this.userId = data.userId;
        this.albumId = data.albumId;
        this.createdAt = data.createdAt;
        this.albums = data.albums;
        this.users = data.users;
    }
}