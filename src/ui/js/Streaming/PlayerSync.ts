import { signal } from "@targoninc/jess";
import { eventBus } from "../Classes/EventBus.ts";
import { currentTrackId, currentTrackPosition, currentUser, playingElsewhere, playingHere } from "../state.ts";
import { PlayManager } from "./PlayManager.ts";

export interface PlayerState {
    deviceId: string;
    deviceName: string;
    platform: string;
    trackId: number | null;
    position: number;
    duration: number;
    playing: boolean;
}

export interface PlayerDevice extends PlayerState {
    lastSeen: number;
    local: boolean;
}

const DEVICE_ID_KEY = "lyda-player-device-id";
const HEARTBEAT_MS = 10_000;
const STALE_MS = 30_000;
const POSITION_THROTTLE_MS = 1_000;
const TRANSFER_TIMEOUT_MS = 8_000;

function createDeviceId(): string {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
        return stored;
    }
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
}

function platformName(): string {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
        return "iOS";
    }
    if (/Android/.test(ua)) {
        return "Android";
    }
    if (/Macintosh|Mac OS X/.test(ua)) {
        return "macOS";
    }
    if (/Windows/.test(ua)) {
        return "Windows";
    }
    return "Web";
}

const localDeviceId = createDeviceId();
const localPlatform = platformName();
const localDeviceName = `${localPlatform} browser`;
const remoteDevices = new Map<string, PlayerDevice>();

export const playerDevices = signal<PlayerDevice[]>([]);
export const activePlayerDeviceId = signal<string | null>(null);

let initialized = false;
let applyingRemote = false;
let lastPositionSent = 0;
let positionTimer: number | null = null;
let pendingTransfer: {
    targetDeviceId: string;
    resume: PlayerState;
    timeout: number;
} | null = null;

function currentState(): PlayerState {
    const trackId = currentTrackId.value || null;
    return {
        deviceId: localDeviceId,
        deviceName: localDeviceName,
        platform: localPlatform,
        trackId,
        position: currentTrackPosition.value.absolute,
        duration: trackId ? PlayManager.getDuration(trackId) : 0,
        playing: playingHere.value,
    };
}

function refreshDevices() {
    if (!currentUser.value) {
        playerDevices.value = [];
        return;
    }
    const now = Date.now();
    for (const [id, device] of remoteDevices) {
        if (now - device.lastSeen > STALE_MS) {
            remoteDevices.delete(id);
        }
    }
    if (activePlayerDeviceId.value !== localDeviceId && activePlayerDeviceId.value && !remoteDevices.has(activePlayerDeviceId.value)) {
        activePlayerDeviceId.value = null;
        playingElsewhere.value = false;
    }
    const local = {
        ...currentState(),
        lastSeen: now,
        local: true,
    };
    playerDevices.value = [local, ...remoteDevices.values()];
}

function publishState() {
    if (!currentUser.value) {
        return;
    }
    const state = currentState();
    eventBus.send({type: "player:state", payload: state});
    refreshDevices();
}

function scheduleState() {
    if (positionTimer !== null) {
        return;
    }
    positionTimer = window.setTimeout(() => {
        positionTimer = null;
        publishState();
    }, 50);
}

function schedulePositionState() {
    if (!playingHere.value || Date.now() - lastPositionSent < POSITION_THROTTLE_MS) {
        return;
    }
    lastPositionSent = Date.now();
    scheduleState();
}

function relativePosition(state: PlayerState): number {
    if (!state.duration || state.duration <= 0) {
        return 0;
    }
    return Math.min(Math.max(state.position / state.duration, 0), 1);
}

function setTrackPosition(state: PlayerState) {
    currentTrackPosition.value = {
        absolute: Math.max(0, state.position),
        relative: relativePosition(state),
    };
}

async function applyRemoteState(state: PlayerState) {
    if (!state.trackId) {
        return;
    }

    applyingRemote = true;
    try {
        const trackChanged = currentTrackId.value !== state.trackId;
        if (trackChanged) {
            currentTrackId.value = state.trackId;
        }
        setTrackPosition(state);
        if (trackChanged) {
            await PlayManager.initializeTrackAsync(state.trackId);
        } else if (!playingHere.value) {
            await PlayManager.scrubTo(state.trackId, relativePosition(state));
        }
    } finally {
        applyingRemote = false;
        refreshDevices();
    }
}

function cancelPendingTransfer() {
    if (pendingTransfer) {
        clearTimeout(pendingTransfer.timeout);
        pendingTransfer = null;
    }
}

async function handleTransfer(payload: PlayerState & {targetDeviceId: string; sourceDeviceId: string}) {
    if (payload.targetDeviceId !== localDeviceId || !payload.trackId) {
        return;
    }

    cancelPendingTransfer();
    activePlayerDeviceId.value = localDeviceId;
    playingElsewhere.value = false;

    if (payload.playing) {
        await PlayManager.startAsync(payload.trackId, true);
        const relative = relativePosition(payload);
        if (relative > 0) {
            await PlayManager.scrubTo(payload.trackId, relative);
        }
    } else {
        currentTrackId.value = payload.trackId;
        setTrackPosition(payload);
        await PlayManager.initializeTrackAsync(payload.trackId);
    }
    publishState();
}

async function handleState(state: PlayerState, receivedAt: number) {
    if (state.deviceId === localDeviceId) {
        return;
    }

    const device: PlayerDevice = {
        ...state,
        lastSeen: receivedAt,
        local: false,
    };
    remoteDevices.set(state.deviceId, device);

    if (state.playing) {
        activePlayerDeviceId.value = state.deviceId;
        playingElsewhere.value = true;
        if (pendingTransfer?.targetDeviceId === state.deviceId) {
            cancelPendingTransfer();
        }
        if (playingHere.value) {
            await PlayManager.pauseAsync(currentTrackId.value);
        }
        await applyRemoteState(state);
    } else if (activePlayerDeviceId.value === state.deviceId) {
        playingElsewhere.value = false;
        await applyRemoteState(state);
    }

    refreshDevices();
}

export class PlayerSync {
    static initialize() {
        if (initialized) {
            return;
        }
        initialized = true;

        eventBus.subscribe("player:", event => {
            if (!event?.payload || !event.payload.deviceId) {
                return;
            }
            if (event.type === "player:state") {
                void handleState(event.payload, event.timestamp ?? Date.now());
            } else if (event.type === "player:transfer") {
                void handleTransfer(event.payload);
            }
        });

        currentTrackId.subscribe(() => {
            if (!applyingRemote) {
                scheduleState();
            }
        });
        currentTrackPosition.subscribe(() => {
            if (!applyingRemote) {
                schedulePositionState();
            }
        });
        playingHere.subscribe((playing, changed) => {
            if (!changed) {
                return;
            }
            if (playing) {
                activePlayerDeviceId.value = localDeviceId;
                playingElsewhere.value = false;
                cancelPendingTransfer();
            }
            publishState();
        });
        currentUser.subscribe(user => {
            if (!user) {
                remoteDevices.clear();
                activePlayerDeviceId.value = null;
                playerDevices.value = [];
                return;
            }
            publishState();
        });

        setInterval(() => {
            publishState();
            refreshDevices();
        }, HEARTBEAT_MS);
        setInterval(refreshDevices, HEARTBEAT_MS);
        refreshDevices();
    }

    static async transferTo(targetDeviceId: string) {
        if (targetDeviceId === localDeviceId || !remoteDevices.has(targetDeviceId)) {
            return;
        }
        const resume = currentState();
        if (!resume.trackId) {
            return;
        }

        cancelPendingTransfer();
        const timeout = window.setTimeout(() => {
            if (!pendingTransfer || playingHere.value) {
                return;
            }
            const shouldResume = pendingTransfer.resume;
            pendingTransfer = null;
            activePlayerDeviceId.value = null;
            playingElsewhere.value = false;
            if (shouldResume.trackId && shouldResume.playing) {
                void (async () => {
                    await PlayManager.startAsync(shouldResume.trackId!, true);
                    const relative = relativePosition(shouldResume);
                    if (relative > 0) {
                        await PlayManager.scrubTo(shouldResume.trackId!, relative);
                    }
                })();
            }
        }, TRANSFER_TIMEOUT_MS);

        pendingTransfer = {targetDeviceId, resume, timeout};
        activePlayerDeviceId.value = targetDeviceId;
        playingElsewhere.value = true;
        eventBus.send({
            type: "player:transfer",
            payload: {
                ...resume,
                targetDeviceId,
            },
        });
        if (playingHere.value) {
            await PlayManager.pauseAsync(currentTrackId.value);
        }
    }
}
