import { Config } from "./Config.ts";

export interface Subscription {
    unsubscribe: () => void;
}

type EventCallback = (event: any) => void;

interface InternalSubscription {
    id: string;
    callback: EventCallback;
}

interface RealtimeCertificateHash {
    algorithm: string;
    value: string;
}

interface RealtimeConfigResponse {
    websocket: {
        enabled: boolean;
        path: string;
    };
    webtransport: {
        enabled: boolean;
        port: number;
        path: string;
        serverCertificateHashes: RealtimeCertificateHash[];
    };
}

interface RealtimeTokenResponse {
    token: string;
    expiresAt: number;
}

export class EventBus {
    private static instance: EventBus;
    private ws: WebSocket | null = null;
    private transport: WebTransport | null = null;
    private commandWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
    private subscriptions: Map<string, InternalSubscription[]> = new Map();
    private reconnectTimeout: number | null = null;
    private pendingMessages: string[] = [];
    private readonly encoder = new TextEncoder();
    private readonly url: string;
    private nextId: number = 0;
    private generation: number = 0;

    private constructor() {
        const baseUrl = Config.apiBaseUrl;
        this.url = baseUrl.replace(/^http/, "ws") + "/events";
        void this.connect();
    }

    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
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
        const message = JSON.stringify(data);
        if (this.commandWriter) {
            void this.writeCommand(message);
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
            return;
        }

        if (this.pendingMessages.length >= 100) {
            this.pendingMessages.shift();
        }
        this.pendingMessages.push(message);
    }

    private async connect(): Promise<void> {
        const generation = ++this.generation;
        this.closeConnections();

        const config = await this.loadConfig();
        if (generation !== this.generation) {
            return;
        }

        if (config?.webtransport.enabled && this.canUseWebTransport()) {
            try {
                await this.connectWebTransport(config, generation);
                return;
            } catch (e) {
                console.warn("WebTransport connection failed, falling back to WebSocket", e);
            }
        }

        if (generation !== this.generation) {
            return;
        }

        if (config && !config.websocket.enabled) {
            console.warn("Realtime events are disabled");
            return;
        }

        this.connectWebSocket(generation);
    }

    private canUseWebTransport(): boolean {
        return typeof WebTransport !== "undefined" &&
            window.isSecureContext &&
            Config.realtimeBaseUrl.startsWith("https://");
    }

    private async connectWebTransport(config: RealtimeConfigResponse, generation: number): Promise<void> {
        const url = this.webTransportUrl(config);
        const transport = new WebTransport(url, this.webTransportOptions(config));
        try {
            await transport.ready;
        } catch (e) {
            try {
                transport.close();
            } catch {
                // Already closed.
            }
            throw e;
        }

        if (generation !== this.generation) {
            transport.close();
            return;
        }

        this.transport = transport;
        console.log(`EventBus connected over WebTransport to ${url}`);

        void this.readWebTransportEvents(transport);
        void this.openCommandStream(transport);
        void transport.closed.then(() => {
            if (this.transport === transport) {
                console.warn("EventBus WebTransport connection closed. Reconnecting...");
                this.scheduleReconnect();
            }
        }).catch(() => {
            if (this.transport === transport) {
                this.scheduleReconnect();
            }
        });
    }

    private webTransportUrl(config: RealtimeConfigResponse): string {
        const apiUrl = new URL(Config.realtimeBaseUrl);
        const port = config.webtransport.port;
        const url = new URL(config.webtransport.path, `https://${apiUrl.hostname}`);
        if (port && port !== 443) {
            url.port = String(port);
        }
        return url.toString();
    }

    private webTransportOptions(config: RealtimeConfigResponse): WebTransportOptions | undefined {
        const hashes = config.webtransport.serverCertificateHashes;
        if (hashes.length === 0) {
            return undefined;
        }

        return {
            serverCertificateHashes: hashes
                .filter(hash => hash.algorithm === "sha-256")
                .map(hash => ({
                    algorithm: "sha-256",
                    value: Uint8Array.from(atob(hash.value), c => c.charCodeAt(0)),
                })),
        };
    }

    private async openCommandStream(transport: WebTransport): Promise<void> {
        try {
            const stream = await transport.createBidirectionalStream();
            if (this.transport !== transport) {
                return;
            }
            const writer = stream.writable.getWriter();

            const token = await this.loadToken();
            if (this.transport !== transport) {
                await writer.close();
                return;
            }
            if (token) {
                await writer.write(this.encoder.encode(`${JSON.stringify({type: "auth", token})}\n`));
            }

            this.commandWriter = writer;
            await this.flushPending();
        } catch (e) {
            console.error("Failed to open EventBus command stream", e);
            this.scheduleReconnect();
        }
    }

    private async readWebTransportEvents(transport: WebTransport): Promise<void> {
        try {
            const streams = transport.incomingUnidirectionalStreams.getReader();
            while (this.transport === transport) {
                const {value, done} = await streams.read();
                if (done) {
                    return;
                }
                void this.readWebTransportEventStream(value);
            }
        } catch (e) {
            if (this.transport === transport) {
                console.error("EventBus WebTransport read failed", e);
            }
        }
    }

    private async readWebTransportEventStream(stream: ReadableStream<Uint8Array>): Promise<void> {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
            while (true) {
                const {value, done} = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, {stream: true});
                buffer = this.handleLines(buffer);
            }
            buffer += decoder.decode();
            this.handleLines(`${buffer}\n`);
        } catch (e) {
            console.error("EventBus WebTransport event stream failed", e);
        }
    }

    private handleLines(buffer: string): string {
        const lines = buffer.split("\n");
        const remainder = lines.pop() ?? "";
        lines.filter(line => line.length > 0).forEach(line => this.handleMessage(line));
        return remainder;
    }

    private connectWebSocket(generation: number): void {
        console.log(`Connecting to EventBus at ${this.url}`);
        const socket = new WebSocket(this.url);
        this.ws = socket;

        socket.onopen = () => {
            if (generation !== this.generation) {
                socket.close();
                return;
            }
            void this.flushPending();
        };

        socket.onmessage = (event) => {
            if (typeof event.data === "string") {
                this.handleMessage(event.data);
            }
        };

        socket.onclose = () => {
            if (this.ws === socket) {
                console.warn("EventBus connection closed. Reconnecting...");
                this.scheduleReconnect();
            }
        };

        socket.onerror = (error) => {
            console.error("EventBus error:", error);
            socket.close();
        };
    }

    private handleMessage(raw: string): void {
        try {
            const data = JSON.parse(raw);
            const type = data.type || data.status || "";

            this.subscriptions.forEach((subs, prefix) => {
                if (type.startsWith(prefix)) {
                    subs.forEach(sub => sub.callback(data));
                }
            });
        } catch (e) {
            console.error("Failed to parse EventBus message", e);
        }
    }

    private async loadConfig(): Promise<RealtimeConfigResponse | null> {
        try {
            const response = await fetch(`${Config.apiBaseUrl}/config/realtime`, {
                credentials: "include",
            });
            if (!response.ok) {
                return null;
            }
            return await response.json() as RealtimeConfigResponse;
        } catch (e) {
            console.warn("Failed to load realtime config", e);
            return null;
        }
    }

    private async loadToken(): Promise<string | null> {
        try {
            const response = await fetch(`${Config.apiBaseUrl}/events/token`, {
                credentials: "include",
            });
            if (!response.ok) {
                return null;
            }
            const data = await response.json() as RealtimeTokenResponse;
            return data.token ?? null;
        } catch (e) {
            console.warn("Failed to load realtime token", e);
            return null;
        }
    }

    private async writeCommand(message: string): Promise<void> {
        const writer = this.commandWriter;
        if (!writer) {
            return;
        }

        try {
            await writer.write(this.encoder.encode(`${message}\n`));
        } catch (e) {
            console.error("EventBus WebTransport send failed", e);
            this.scheduleReconnect();
        }
    }

    private async flushPending(): Promise<void> {
        while (this.pendingMessages.length > 0) {
            const message = this.pendingMessages.shift();
            if (message === undefined) {
                continue;
            }

            if (this.commandWriter) {
                await this.writeCommand(message);
            } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(message);
            } else {
                this.pendingMessages.unshift(message);
                return;
            }
        }
    }

    private closeConnections(): void {
        if (this.ws) {
            const socket = this.ws;
            this.ws = null;
            socket.onclose = null;
            socket.close();
        }

        if (this.transport) {
            const transport = this.transport;
            this.transport = null;
            this.commandWriter = null;
            void transport.close();
        }
        this.commandWriter = null;
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = window.setTimeout(() => {
            this.reconnectTimeout = null;
            void this.connect();
        }, 5000);
    }
}

export const eventBus = EventBus.getInstance();
