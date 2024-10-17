import { User } from 'src/ui/js/Models/User.mjs';

export class Follow {
    /** @var {number} userId */
    userId;
    /** @var {number} followingUserId */
    followingUserId;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {User|null} user */
    user = null;
    constructor(data) {
        this.userId = data.userId;
        this.followingUserId = data.followingUserId;
        this.createdAt = data.createdAt;
        this.users = data.users;
    }
}