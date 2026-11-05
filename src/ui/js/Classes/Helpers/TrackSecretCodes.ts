import { LydaCache } from "../../Cache/LydaCache.ts";
import { CacheItem } from "../../Cache/CacheItem.ts";

const trackSecretCodesCacheKey = "trackSecretCodes";
const trackSecretCodes: Record<number, string> = LydaCache.get<Record<number, string>>(trackSecretCodesCacheKey).content ?? {};

function persistTrackSecretCodes() {
    LydaCache.set(trackSecretCodesCacheKey, new CacheItem(trackSecretCodes));
}

export function setTrackSecretCode(trackId: number, code: string) {
    if (!trackId || !code || trackSecretCodes[trackId] === code) {
        return;
    }
    trackSecretCodes[trackId] = code;
    persistTrackSecretCodes();
}

export function getTrackSecretCode(trackId: number): string {
    return trackSecretCodes[trackId] ?? "";
}

export function storeSecretCodeFromUrl() {
    const segments = window.location.pathname.split("/").filter(p => p.length > 0);
    if (segments[0] !== "track") {
        return;
    }
    const trackId = Number(segments[1]);
    const code = segments[2];
    if (!Number.isFinite(trackId) || !code) {
        return;
    }
    setTrackSecretCode(trackId, code);
}
