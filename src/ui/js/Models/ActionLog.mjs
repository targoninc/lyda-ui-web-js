import { User } from 'src/ui/js/Models/User.mjs';

export class ActionLog {
    /** @var {number} id */
    id;
    /** @var {number} userId */
    userId;
    /** @var {string} actionName */
    actionName;
    /** @var {number} actionedUserId */
    actionedUserId;
    /** @var {string|null} additionalInfo */
    additionalInfo = null;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {User|null} user */
    user = null;
    constructor(data) {
        this.id = data.id;
        this.userId = data.userId;
        this.actionName = data.actionName;
        this.actionedUserId = data.actionedUserId;
        this.additionalInfo = data.additionalInfo;
        this.createdAt = data.createdAt;
        this.users = data.users;
    }
}