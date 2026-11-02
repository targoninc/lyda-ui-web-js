import type { RealtimeWebSocketConfig } from "./RealtimeWebSocketConfig.ts";
import type { RealtimeWebTransportConfig } from "./RealtimeWebTransportConfig.ts";

export interface RealtimeConfigResponse {
    websocket: RealtimeWebSocketConfig;
    webtransport: RealtimeWebTransportConfig;
}
