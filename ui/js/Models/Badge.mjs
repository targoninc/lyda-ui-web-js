import { UserBadge } from 'UserBadge.mjs';

export class Badge {
    /** @var {number} id */
    id;
    /** @var {string} name */
    name;
    /** @var {string} description */
    description;
    /** @var {UserBadge[]|null} user_badges */
    user_badges = null;
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.user_badges = data.user_badges;
    }
}