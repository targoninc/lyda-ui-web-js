import type { EventCallback } from "./EventCallback.ts";

export interface InternalSubscription {
    id: string;
    callback: EventCallback;
}
