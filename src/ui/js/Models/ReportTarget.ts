import {MediaFileType} from "@targoninc/lyda-shared/src/Enums/MediaFileType";

export interface ReportTarget {
    entityType: "track" | "media";
    entityId: number;
    mediaType?: MediaFileType;
}
