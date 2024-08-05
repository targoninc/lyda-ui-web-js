import {CacheItem} from "./CacheItem.mjs";

export class LydaCache {
    static disable = false;
    static cacheImplementation = sessionStorage;

    /**
     * Get a cache item from the cache
     * @param cacheKey {string} The key of the cache item
     * @returns {CacheItem} The cache item content or null if the cache is disabled
     */
    static get(cacheKey) {
        if (this.disable) {
            return null;
        }

        const cacheItem = this.cacheImplementation.getItem(cacheKey);

        let value;
        try {
            value = JSON.parse(cacheItem);
        } catch (e) {
            value = cacheItem;
        }

        if (value === null) {
            return new CacheItem(null);
        }

        if (value.content) {
            try {
                value.content = JSON.parse(value.content);
            } catch (e) { /* empty */ }
        }

        return value;
    }

    static set(cacheKey, cacheItem) {
        if (this.disable) {
            return;
        }
        if (!(cacheItem instanceof CacheItem)) {
            throw new Error("cacheItem must be an instance of CacheItem");
        }
        this.cacheImplementation.setItem(cacheKey, JSON.stringify(cacheItem));
        if (cacheItem.reFetchUrl !== null) {
            setTimeout(() => {
                this.reFetch(cacheKey, cacheItem);
            }, cacheItem.reFetchTtlInSeconds * 1000);
        }
    }

    static reFetch(cacheKey, cacheItem) {
        if (this.disable) {
            return;
        }
        if (!(cacheItem instanceof CacheItem)) {
            throw new Error("cacheItem must be an instance of CacheItem");
        }
        fetch(cacheItem.reFetchUrl, {
            method: cacheItem.reFetchMethod,
            headers: cacheItem.reFetchHeaders,
            body: cacheItem.reFetchBody,
            credentials: "include"
        }).then(async (response) => {
            const res = await response.text();
            try {
                return JSON.parse(res);
            } catch (e) {
                return res;
            }
        }).then((data) => {
            cacheItem.content = data;
            cacheItem.refetchCount++;
            this.cacheImplementation.setItem(cacheKey, JSON.stringify(cacheItem));
        });
    }

    static clear() {
        this.cacheImplementation.clear();
    }
}
