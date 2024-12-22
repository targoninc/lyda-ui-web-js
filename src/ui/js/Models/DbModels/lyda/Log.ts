export interface Log {
    id: number;
    correlation_id: string;
    time: string;
    host: string;
    stack: string;
    logLevel: number;
    message: string;
    properties: string;
}