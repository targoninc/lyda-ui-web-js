import { Music } from 'src/ui/js/Models/Music.mjs';
import { User } from 'src/ui/js/Models/User.mjs';

export class Comment {
    /** @var {number} id */
    id;
    /** @var {number|null} parentId */
    parentId = null;
    /** @var {number} trackId */
    trackId;
    /** @var {number|null} userId */
    userId = null;
    /** @var {string} content */
    content;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {boolean} potentiallyHarmful */
    potentiallyHarmful;
    /** @var {boolean} hidden */
    hidden;
    /** @var {Comment|null} comment */
    comment = null;
    /** @var {Music|null} music */
    music = null;
    /** @var {User|null} user */
    user = null;
    /** @var {Comment[]|null} comments */
    comments = null;
    constructor(data) {
        this.id = data.id;
        this.parentId = data.parentId;
        this.trackId = data.trackId;
        this.userId = data.userId;
        this.content = data.content;
        this.createdAt = data.createdAt;
        this.potentiallyHarmful = data.potentiallyHarmful;
        this.hidden = data.hidden;
        this.comments = data.comments;
        this.music = data.music;
        this.users = data.users;
    }
}