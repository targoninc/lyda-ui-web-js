import {User} from "./User.js";
import {CollaboratorType} from "./CollaboratorType.js";

export interface TrackCollaborator {
    collab_type?: CollaboratorType;
    user?: User;
    track_id: number;
    user_id: number;
    type: number;
    approved: boolean;
    denied: boolean;
    created_at: Date;
    updated_at: Date;
}