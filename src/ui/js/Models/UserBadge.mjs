import { Badge } from 'src/ui/js/Models/Badge.mjs';
import { User } from 'src/ui/js/Models/User.mjs';

export class UserBadge {
    /** @var {number} userId */
    userId;
    /** @var {number} badgeId */
    badgeId;
    /** @var {Date} givenAt */
    givenAt;
    /** @var {Badge|null} badge */
    badge = null;
    /** @var {User|null} user */
    user = null;
    constructor(data) {
        this.userId = data.userId;
        this.badgeId = data.badgeId;
        this.givenAt = data.givenAt;
        this.badges = data.badges;
        this.users = data.users;
    }
}