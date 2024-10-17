import { Music } from 'src/ui/js/Models/Music.mjs';
import { User } from 'src/ui/js/Models/User.mjs';

export class Tracklike {
    /** @var {number} userId */
    userId;
    /** @var {number} trackId */
    trackId;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {Music|null} music */
    music = null;
    /** @var {User|null} user */
    user = null;
    constructor(data) {
        this.userId = data.userId;
        this.trackId = data.trackId;
        this.createdAt = data.createdAt;
        this.music = data.music;
        this.users = data.users;
    }
}