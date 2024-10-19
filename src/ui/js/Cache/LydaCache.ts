import {CacheItem} from "./CacheItem.ts";

export class LydaCache {
    static disable = false;
    static cacheImplementation = sessionStorage;

    static get(cacheKey: string): CacheItem {
        if (this.disable) {
            return new CacheItem(null);
        }

        const cacheItem = this.cacheImplementation.getItem(cacheKey);

        let value;
        try {
            value = JSON.parse(<string>cacheItem);
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

    static set(cacheKey: string, cacheItem: any) {
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

    static reFetch(cacheKey: string, cacheItem: any) {
        if (this.disable) {
            return;
        }
        if (!(cacheItem instanceof CacheItem)) {
            throw new Error("cacheItem must be an instance of CacheItem");
        }
        if (!cacheItem.reFetchUrl) {
            return;
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

    static remove(cacheKey: string) {
        this.cacheImplementation.removeItem(cacheKey);
    }
}
