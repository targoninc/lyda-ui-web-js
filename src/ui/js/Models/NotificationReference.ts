import {NotificationReferenceType} from "../EnumsShared/NotificationReferenceType.ts";

export interface NotificationReference {
    type: NotificationReferenceType;
    id: number;
    object?: any;
}