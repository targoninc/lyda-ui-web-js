import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import { ApiRoutes } from "../Api/ApiRoutes.ts";
import { Images } from "../Enums/Images.ts";
import { getTrackSecretCode } from "../Classes/Helpers/TrackSecretCodes.ts";

interface CachedImage {
    key: string;
    blob: Blob;
    fetchedAt: number;
    etag?: string;
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
    private readonly blobAccessOrder = new Map<string, number>();
    private blobAccessCounter = 0;
    private static readonly BLOB_CACHE_MAX = 50;
    private static readonly DB_NAME = "LydaImageCache";
    private static readonly DB_VERSION = 2;
    private static readonly IMAGE_STORE = "images";
    private static readonly IMAGE_TTL = 24 * 60 * 60 * 1000;
    private static readonly DB_MAX_ENTRIES = 500;

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

    private touchBlobUrl(key: string) {
        this.blobAccessOrder.set(key, ++this.blobAccessCounter);
    }

    private dropOldestCacheEntry(): string | null {
        if (this.blobUrlCache.size < CachingService.BLOB_CACHE_MAX) {
            return null;
        }
        let oldestKey: string | null = null;
        let oldestOrder = Infinity;
        for (const [key, order] of this.blobAccessOrder) {
            if (this.blobUrlCache.has(key) && order < oldestOrder) {
                oldestOrder = order;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            // Do not revoke the object URL here: elements that already loaded
            // it keep displaying the image, but any element created later
            // (e.g. an image modal reusing an avatar's cached URL) would get
            // a broken image. Dropping the entry only means the next request
            // for this image resolves to a fresh URL.
            this.blobUrlCache.delete(oldestKey);
            this.blobAccessOrder.delete(oldestKey);
        }
        return oldestKey;
    }

    private async capIndexedDb() {
        try {
            const db = await this.getDb();
            const tx = db.transaction(CachingService.IMAGE_STORE, "readonly");
            const store = tx.objectStore(CachingService.IMAGE_STORE);
            const count = await new Promise<number>((resolve) => {
                const req = store.count();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(0);
            });
            if (count <= CachingService.DB_MAX_ENTRIES) {
                return;
            }
            const allReq = store.getAll();
            allReq.onsuccess = async () => {
                const all: CachedImage[] = allReq.result;
                all.sort((a, b) => a.fetchedAt - b.fetchedAt);
                const toDelete = all.slice(0, all.length - CachingService.DB_MAX_ENTRIES);
                if (toDelete.length === 0) return;
                const writeTx = db.transaction(CachingService.IMAGE_STORE, "readwrite");
                const writeStore = writeTx.objectStore(CachingService.IMAGE_STORE);
                for (const entry of toDelete) {
                    writeStore.delete(entry.key);
                }
                writeTx.onerror = () => {};
            };
        } catch {
            // ignore
        }
    }

    private cacheKey(id: number, type: MediaFileType, quality: number): string {
        const code = type === MediaFileType.trackCover ? getTrackSecretCode(id) : "";
        return `${type}_${id}_${quality}${code ? `_${code}` : ""}`;
    }

    private async readCachedImage(key: string): Promise<CachedImage | null> {
        try {
            const db = await this.getDb();
            return await new Promise<CachedImage | null>((resolve) => {
                const tx = db.transaction(CachingService.IMAGE_STORE, "readonly");
                const store = tx.objectStore(CachingService.IMAGE_STORE);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result ?? null);
                request.onerror = () => resolve(null);
            });
        } catch {
            return null;
        }
    }

    private async storeCachedImage(cached: CachedImage): Promise<void> {
        try {
            const db = await this.getDb();
            await new Promise<void>((resolve) => {
                const tx = db.transaction(CachingService.IMAGE_STORE, "readwrite");
                const store = tx.objectStore(CachingService.IMAGE_STORE);
                store.put(cached);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
            this.capIndexedDb();
        } catch {
            // storage failed, use the image without caching
        }
    }

    private useBlob(key: string, blob: Blob): string {
        const existing = this.blobUrlCache.get(key);
        if (existing) {
            this.touchBlobUrl(key);
            return existing;
        }
        this.dropOldestCacheEntry();
        const url = URL.createObjectURL(blob);
        this.blobUrlCache.set(key, url);
        this.touchBlobUrl(key);
        return url;
    }

    async getImageUrl(id: number, type: MediaFileType, quality: number = 500): Promise<string> {
        const key = this.cacheKey(id, type, quality);
        const serverUrl = `${ApiRoutes.getImageMedia}?id=${id}&quality=${quality}&mediaFileType=${type}${type === MediaFileType.trackCover && getTrackSecretCode(id) ? `&code=${encodeURIComponent(getTrackSecretCode(id))}` : ""}`;

        const existing = this.blobUrlCache.get(key);
        if (existing) {
            this.touchBlobUrl(key);
            return existing;
        }

        const cached = await this.readCachedImage(key);
        if (cached && Date.now() - cached.fetchedAt < CachingService.IMAGE_TTL) {
            return this.useBlob(key, cached.blob);
        }

        try {
            const resp = await fetch(serverUrl, {
                credentials: "include",
                cache: cached ? "no-cache" : "default",
            });
            if (resp.status === 304 && cached) {
                cached.fetchedAt = Date.now();
                await this.storeCachedImage(cached);
                return this.useBlob(key, cached.blob);
            }

            if (!resp.ok) {
                return cached ? this.useBlob(key, cached.blob) : (DEFAULT_FALLBACKS[type] ?? serverUrl);
            }

            const etag = resp.headers.get("etag") ?? undefined;
            if (cached?.etag && etag === cached.etag) {
                cached.fetchedAt = Date.now();
                await this.storeCachedImage(cached);
                return this.useBlob(key, cached.blob);
            }

            const blob = await resp.blob();
            const next = {key, blob, fetchedAt: Date.now(), etag};
            await this.storeCachedImage(next);
            return this.useBlob(key, blob);
        } catch {
            return cached ? this.useBlob(key, cached.blob) : (DEFAULT_FALLBACKS[type] ?? serverUrl);
        }
    }

    async deleteCacheEntry(id: number, type: MediaFileType, quality: number = 500): Promise<void> {
        const key = this.cacheKey(id, type, quality);

        const existingUrl = this.blobUrlCache.get(key);
        if (existingUrl) {
            URL.revokeObjectURL(existingUrl);
            this.blobUrlCache.delete(key);
        }
        this.blobAccessOrder.delete(key);

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
        this.blobAccessOrder.clear();

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
