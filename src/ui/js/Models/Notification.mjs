import { Music } from 'src/ui/js/Models/Music.mjs';
import { User } from 'src/ui/js/Models/User.mjs';

export class Notification {
    /** @var {number} id */
    id;
    /** @var {number} userId */
    userId;
    /** @var {number|null} trackId */
    trackId = null;
    /** @var {string} type */
    type;
    /** @var {string} searchKey */
    searchKey;
    /** @var {string} message */
    message;
    /** @var {boolean} isRead */
    isRead;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {Music|null} music */
    music = null;
    /** @var {User|null} user */
    user = null;
    constructor(data) {
        this.id = data.id;
        this.userId = data.userId;
        this.trackId = data.trackId;
        this.type = data.type;
        this.searchKey = data.searchKey;
        this.message = data.message;
        this.isRead = data.isRead;
        this.createdAt = data.createdAt;
        this.music = data.music;
        this.users = data.users;
    }
}