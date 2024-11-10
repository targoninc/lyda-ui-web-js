import { MediaFileType } from "../Enums/MediaFileType.ts";
import { ApiRoutes } from "./ApiRoutes.ts";

export class MediaUploader {
    static async upload(type: MediaFileType, referenceId: number, file: File) {
        const formData = new FormData();
        formData.append("type", type);
        formData.append("referenceId", referenceId.toString());
        formData.append("file", file);

        const response = await fetch(ApiRoutes.uploadMedia, {
            method: "POST",
            body: formData,
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`Failed to upload media: ${response.statusText}`);
        }

        return await response.text();
    }
}