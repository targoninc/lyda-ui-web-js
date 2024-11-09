import {MediaFileType} from "../Enums/MediaFileType.ts";
import {Api} from "./Api.ts";
import {ApiRoutes} from "./ApiRoutes.ts";

export class MediaUploader {
    static async upload(type: MediaFileType, referenceId: number, file: File) {
        const formData = new FormData();
        formData.append("type", type);
        formData.append("referenceId", referenceId.toString());

        const buffer = await file.arrayBuffer();
        const blob = new Blob([buffer], { type: file.type });
        formData.append("file", blob);

        return await Api.postRawAsync(ApiRoutes.uploadMedia, {
            method: "POST",
            body: formData,
            credentials: "include"
        });
    }
}