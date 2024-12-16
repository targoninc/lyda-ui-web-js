import {NotificationReferenceType} from "../Enums/NotificationReferenceType.ts";

export interface NotificationReference {
    type: NotificationReferenceType;
    id: number;
    object?: any;
}