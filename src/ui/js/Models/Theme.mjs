import { User } from 'src/ui/js/Models/User.mjs';

export class Theme {
    /** @var {number} id */
    id;
    /** @var {number} userId */
    userId;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {string} name */
    name;
    /** @var {User|null} user */
    user = null;
    constructor(data) {
        this.id = data.id;
        this.userId = data.userId;
        this.createdAt = data.createdAt;
        this.name = data.name;
        this.users = data.users;
    }
}