import { Music } from 'src/ui/js/Models/Music.mjs';
import { User } from 'src/ui/js/Models/User.mjs';

export class Listeninghistory {
    /** @var {number} id */
    id;
    /** @var {number|null} userId */
    userId = null;
    /** @var {number} trackId */
    trackId;
    /** @var {string|null} quality */
    quality = null;
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
        this.quality = data.quality;
        this.createdAt = data.createdAt;
        this.music = data.music;
        this.users = data.users;
    }
}