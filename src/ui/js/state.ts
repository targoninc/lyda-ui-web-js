import {signal} from "../fjsc/src/signals.ts";
import {StreamClient} from "./Streaming/StreamClient.ts";
import {PlayingFrom} from "./Models/PlayingFrom.ts";
import {Track} from "./Models/DbModels/Track.ts";

export const dragging = signal(false);

export const navInitialized = signal(false);

export const streamClients = signal<Record<number, StreamClient>>({});

export const currentTrackId = signal(0);

export const trackInfo = signal<Record<number, { track: Track }>>({});

export const volume = signal(0.5);

export const manualQueue = signal<number[]>([]);

export const contextQueue = signal<number[]>([]);

export const autoQueue = signal<number[]>([]);

export const playingFrom = signal<PlayingFrom|null>(null);
