import { Config } from "./Config.ts";

export interface Subscription {
    unsubscribe: () => void;
}

type EventCallback = (event: any) => void;

interface InternalSubscription {
    id: string;
    callback: EventCallback;
}

export class EventBus {
    private static instance: EventBus;
    private ws: WebSocket | null = null;
    private subscriptions: Map<string, InternalSubscription[]> = new Map();
    private reconnectTimeout: number | null = null;
    private readonly url: string;
    private nextId: number = 0;

    private constructor() {
        const baseUrl = Config.apiBaseUrl;
        this.url = baseUrl.replace(/^http/, "ws") + "/events";
        this.connect();
    }

    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    private connect() {
        if (this.ws) {
            this.ws.close();
        }

        console.log(`Connecting to EventBus at ${this.url}`);
        this.ws = new WebSocket(this.url);

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const type = data.type || data.status || ""; // Use type or status as event identifier

                this.subscriptions.forEach((subs, prefix) => {
                    if (type.startsWith(prefix)) {
                        subs.forEach(sub => sub.callback(data));
                    }
                });
            } catch (e) {
                console.error("Failed to parse EventBus message", e);
            }
        };

        this.ws.onclose = () => {
            console.warn("EventBus connection closed. Reconnecting...");
            this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error("EventBus error:", error);
            this.ws?.close();
        };
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = window.setTimeout(() => {
            this.connect();
        }, 5000);
    }

    public subscribe(prefix: string, callback: EventCallback): Subscription {
        if (!this.subscriptions.has(prefix)) {
            this.subscriptions.set(prefix, []);
        }
        
        const id = `${prefix}-${this.nextId++}`;
        this.subscriptions.get(prefix)!.push({ id, callback });

        return {
            unsubscribe: () => {
                const subs = this.subscriptions.get(prefix);
                if (subs) {
                    const index = subs.findIndex(s => s.id === id);
                    if (index !== -1) {
                        subs.splice(index, 1);
                    }
                    if (subs.length === 0) {
                        this.subscriptions.delete(prefix);
                    }
                }
            }
        };
    }

    public send(data: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error("EventBus WebSocket is not open. Cannot send message.", data);
        }
    }
}

export const eventBus = EventBus.getInstance();
