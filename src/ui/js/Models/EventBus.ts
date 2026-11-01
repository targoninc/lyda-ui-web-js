export interface Subscription {
    unsubscribe: () => void;
}

export type EventCallback = (event: any) => void;

export interface InternalSubscription {
    id: string;
    callback: EventCallback;
}

export interface RealtimeConfigResponse {
    websocket: {
        enabled: boolean;
        path: string;
    };
    webtransport: {
        enabled: boolean;
        port: number;
        path: string;
    };
}

export interface RealtimeTokenResponse {
    token: string;
    expiresAt: number;
}
