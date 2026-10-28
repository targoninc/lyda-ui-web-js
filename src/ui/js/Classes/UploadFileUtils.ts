import {UploadableTrack} from "../Models/UploadableTrack.ts";
import {Visibility} from "@targoninc/lyda-shared/src/Enums/Visibility.ts";

export const AUDIO_EXTENSIONS = new Set([
    "mp3", "wav", "flac", "ogg", "oga", "opus", "m4a", "aac", "aiff", "aif", "wma", "alac",
]);

export const AUDIO_ACCEPT = `audio/*,${[...AUDIO_EXTENSIONS].map(extension => `.${extension}`).join(",")}`;

export function isAudioFile(file: File): boolean {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    return file.type.startsWith("audio/") || AUDIO_EXTENSIONS.has(extension);
}

export function cleanTitle(name: string): string {
    return name.replace(/\.[^/.]+$/, "").trim();
}

export function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function defaultUploadState(termsOfService = false): UploadableTrack {
    return {
        title: "",
        credits: "",
        artistname: "",
        release_date: new Date(),
        visibility: Visibility.private,
        genres: [],
        isrc: "",
        upc: "",
        description: "",
        monetization: true,
        price: 1,
        collaborators: [],
        termsOfService,
        wip: false,
        free_download: false,
    };
}

function readDirectory(entry: any): Promise<any[]> {
    const reader = entry.createReader();
    return new Promise((resolve, reject) => {
        const entries: any[] = [];
        const readBatch = () => {
            reader.readEntries((batch: any[]) => {
                if (batch.length === 0) {
                    resolve(entries);
                    return;
                }
                entries.push(...batch);
                readBatch();
            }, reject);
        };
        readBatch();
    });
}

async function filesFromEntry(entry: any, files: File[]): Promise<void> {
    if (entry.isFile) {
        await new Promise<void>((resolve, reject) => {
            entry.file((file: File) => {
                files.push(file);
                resolve();
            }, reject);
        });
        return;
    }
    if (entry.isDirectory) {
        for (const child of await readDirectory(entry)) {
            await filesFromEntry(child, files);
        }
    }
}

/** Reads files from a drop, including recursively walking dropped folders. */
export async function filesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
    const entries = Array.from(dataTransfer.items)
        .map(item => (item as any).webkitGetAsEntry?.())
        .filter(Boolean);

    if (entries.length === 0) {
        return Array.from(dataTransfer.files);
    }

    const files: File[] = [];
    for (const entry of entries) {
        await filesFromEntry(entry, files);
    }
    return files;
}

let pendingBulkFiles: File[] = [];

/** Hand files from the single upload page to the bulk upload page. */
export function setPendingBulkFiles(files: File[]): void {
    pendingBulkFiles = files;
}

export function takePendingBulkFiles(): File[] {
    const files = pendingBulkFiles;
    pendingBulkFiles = [];
    return files;
}
