import { MediaFileType } from "../EnumsShared/MediaFileType.ts";
import { ApiRoutes } from "./ApiRoutes.ts";

export class MediaUploader {
    static upload(
        type: MediaFileType,
        referenceId: number,
        file: File,
        onProgress?: (event: ProgressEvent) => void
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();

            formData.append("type", type);
            formData.append("referenceId", referenceId.toString());
            formData.append("file", file);

            xhr.open("POST", ApiRoutes.uploadMedia, true);
            xhr.withCredentials = true;

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.responseText);
                } else {
                    reject(new Error(`Failed to upload media: ${xhr.responseText}`));
                }
            };

            xhr.onabort = () => {
                reject(new Error("Failed to upload media: Aborted"));
            };

            xhr.onerror = () => {
                reject(new Error("Failed to upload media: Error"));
            };

            if (onProgress && xhr.upload) {
                xhr.upload.onprogress = onProgress;
            }

            xhr.send(formData);
        });
    }
}