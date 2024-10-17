import { TrackCollaborator } from 'src/ui/js/Models/TrackCollaborator.mjs';

export class CollaboratorType {
    /** @var {number} id */
    id;
    /** @var {string} name */
    name;
    /** @var {string} description */
    description;
    /** @var {Date} createdAt */
    createdAt;
    /** @var {Date} updatedAt */
    updatedAt;
    /** @var {TrackCollaborator[]|null} trackCollaboratorsCollaborator */
    trackCollaboratorsCollaborator = null;
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.trackCollaboratorsCollaborator = data.trackCollaboratorsCollaborator;
    }
}