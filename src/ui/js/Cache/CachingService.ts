import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { Images } from "../Enums/Images.ts";

interface CachedImage {
    key: string;
    blob: Blob;
    fetchedAt: number;
}

const DEFAULT_FALLBACKS: Record<string, string> = {
    [MediaFileType.userAvatar]: Images.DEFAULT_AVATAR,
    [MediaFileType.userBanner]: Images.DEFAULT_BANNER,
    [MediaFileType.trackCover]: Images.DEFAULT_COVER_TRACK,
    [MediaFileType.albumCover]: Images.DEFAULT_COVER_ALBUM,
    [MediaFileType.playlistCover]: Images.DEFAULT_COVER_PLAYLIST,
};

export class CachingService {
    private dbPromise: Promise<IDBDatabase> | null = null;
    private readonly blobUrlCache = new Map<string, string>();
    private static readonly DB_NAME = "LydaImageCache";
    private static readonly DB_VERSION = 1;
    private static readonly IMAGE_STORE = "images";
    private static readonly IMAGE_TTL = 24 * 60 * 60 * 1000;

    private getDb(): Promise<IDBDatabase> {
        if (!this.dbPromise) {
            this.dbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(CachingService.DB_NAME, CachingService.DB_VERSION);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(CachingService.IMAGE_STORE)) {
                        db.createObjectStore(CachingService.IMAGE_STORE, { keyPath: "key" });
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
        return this.dbPromise;
    }

    async getImageUrl(id: number, type: MediaFileType, quality: number = 500): Promise<string> {
        const key = `${type}_${id}_${quality}`;

        const existing = this.blobUrlCache.get(key);
        if (existing) {
            return existing;
        }

        try {
            const db = await this.getDb();
            const cached = await new Promise<CachedImage | null>((resolve) => {
                const tx = db.transaction(CachingService.IMAGE_STORE, "readonly");
                const store = tx.objectStore(CachingService.IMAGE_STORE);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result ?? null);
                request.onerror = () => resolve(null);
            });

            if (cached && Date.now() - cached.fetchedAt < CachingService.IMAGE_TTL) {
                const url = URL.createObjectURL(cached.blob);
                this.blobUrlCache.set(key, url);
                return url;
            }
        } catch {
            // fall through
        }

        const serverUrl = `${ApiRoutes.getImageMedia}?id=${id}&quality=${quality}&mediaFileType=${type}`;

        try {
            const resp = await fetch(serverUrl);
            if (!resp.ok) {
                return DEFAULT_FALLBACKS[type] ?? serverUrl;
            }
            const blob = await resp.blob();

            try {
                const db = await this.getDb();
                await new Promise<void>((resolve) => {
                    const tx = db.transaction(CachingService.IMAGE_STORE, "readwrite");
                    const store = tx.objectStore(CachingService.IMAGE_STORE);
                    store.put({ key, blob, fetchedAt: Date.now() });
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => resolve();
                });
            } catch {
                // storage failed, use blob URL without cache
            }

            const url = URL.createObjectURL(blob);
            this.blobUrlCache.set(key, url);
            return url;
        } catch {
            return DEFAULT_FALLBACKS[type] ?? serverUrl;
        }
    }

    async deleteCacheEntry(id: number, type: MediaFileType, quality: number = 500): Promise<void> {
        const key = `${type}_${id}_${quality}`;

        const existingUrl = this.blobUrlCache.get(key);
        if (existingUrl) {
            URL.revokeObjectURL(existingUrl);
            this.blobUrlCache.delete(key);
        }

        try {
            const db = await this.getDb();
            await new Promise<void>((resolve) => {
                const tx = db.transaction(CachingService.IMAGE_STORE, "readwrite");
                const store = tx.objectStore(CachingService.IMAGE_STORE);
                store.delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch {
            // ignore
        }
    }

    async clearCache(): Promise<void> {
        for (const url of this.blobUrlCache.values()) {
            URL.revokeObjectURL(url);
        }
        this.blobUrlCache.clear();

        try {
            const db = await this.getDb();
            await new Promise<void>((resolve) => {
                const tx = db.transaction(CachingService.IMAGE_STORE, "readwrite");
                const store = tx.objectStore(CachingService.IMAGE_STORE);
                store.clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch {
            // ignore
        }
    }
}

export const cachingService = new CachingService();
