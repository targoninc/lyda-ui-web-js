export class CacheItem<T> {
    content: T;
    reFetchUrl: string;
    reFetchMethod;
    reFetchHeaders;
    reFetchBody;
    reFetchTtlInSeconds;
    maximumRefetchCount;
    refetchCount;
    createTime;

    constructor(content: T, reFetchUrl = null, reFetchMethod = "GET", reFetchHeaders = {}, reFetchBody = "", reFetchTtlInSeconds = 60, maximumRefetchCount = 0) {
        this.content = content;
        this.reFetchUrl = reFetchUrl ?? "";
        this.reFetchMethod = reFetchMethod;
        this.reFetchHeaders = reFetchHeaders;
        this.reFetchBody = reFetchBody;
        this.reFetchTtlInSeconds = reFetchTtlInSeconds;
        this.maximumRefetchCount = maximumRefetchCount;
        this.refetchCount = 0;
        this.createTime = new Date();
    }
}