import { CollaboratorType } from 'CollaboratorType.mjs';
import { Music } from 'Music.mjs';
import { User } from 'User.mjs';

export class TrackCollaborator {
    /** @var {number} trackId */
    trackId;
    /** @var {number} userId */
    userId;
    /** @var {number|null} type */
    type = null;
    /** @var {boolean} approved */
    approved;
    /** @var {boolean} denied */
    denied;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {Date} updatedAt */
    updatedAt;
    /** @var {CollaboratorType|null} collaboratorType */
    collaboratorType = null;
    /** @var {Music|null} music */
    music = null;
    /** @var {User|null} user */
    user = null;
    constructor(data) {
        this.trackId = data.trackId;
        this.userId = data.userId;
        this.type = data.type;
        this.approved = data.approved;
        this.denied = data.denied;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.collaboratorTypes = data.collaboratorTypes;
        this.music = data.music;
        this.users = data.users;
    }
}