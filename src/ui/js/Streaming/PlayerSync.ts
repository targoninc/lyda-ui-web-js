import { signal } from "@targoninc/jess";
import { eventBus } from "../Classes/EventBus.ts";
import { autoQueue, contextQueue, currentTrackId, currentTrackPosition, currentUser, loadingAudio, manualQueue, playingHere } from "../state.ts";
import { QueueManager } from "./QueueManager.ts";
import { PlayManager } from "./PlayManager.ts";
import type { PlayerDevice } from "../Models/PlayerSync/PlayerDevice.ts";
import type { PlayerState } from "../Models/PlayerSync/PlayerState.ts";
import type { PlayerTransfer } from "../Models/PlayerSync/PlayerTransfer.ts";
import type { PlayerCommand } from "../Models/PlayerSync/PlayerCommand.ts";
import type { PlayerQueue } from "../Models/PlayerSync/PlayerQueue.ts";
import type { PlayerQueueProbe } from "../Models/PlayerSync/PlayerQueueProbe.ts";
import type { PlayerQueueOffer } from "../Models/PlayerSync/PlayerQueueOffer.ts";
import type { PlayerQueueSync } from "../Models/PlayerSync/PlayerQueueSync.ts";
import type { PlayerQueueSnapshot } from "../Models/PlayerSync/PlayerQueueSnapshot.ts";

const DEVICE_ID_KEY = "lyda-player-device-id";
const TAB_NUMBER_KEY = "lyda-player-tab-number";
const TAB_COUNTER_KEY = "lyda-player-tab-counter";
const HEARTBEAT_MS = 10_000;
const STALE_MS = 30_000;
const POSITION_THROTTLE_MS = 1_000;
const TRANSFER_TIMEOUT_MS = 8_000;
const QUEUE_OFFER_TIMEOUT_MS = 1_500;
const QUEUE_SYNC_TIMEOUT_MS = 4_000;
const TAB_CHANNEL_NAME = "lyda-player-sync";

function createDeviceId(): string {
    const stored = sessionStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
        return stored;
    }
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(DEVICE_ID_KEY, id);
    return id;
}

function tabNumber(): number {
    const stored = Number.parseInt(sessionStorage.getItem(TAB_NUMBER_KEY) ?? "", 10);
    if (Number.isInteger(stored) && stored > 0) {
        return stored;
    }
    const next = Math.max(1, Number.parseInt(localStorage.getItem(TAB_COUNTER_KEY) ?? "0", 10) + 1);
    localStorage.setItem(TAB_COUNTER_KEY, String(next));
    sessionStorage.setItem(TAB_NUMBER_KEY, String(next));
    return next;
}

const localDeviceId = createDeviceId();
const localPlatform = "web";
const localDeviceName = `Lyda Web - Tab ${tabNumber()}`;
const remoteDevices = new Map<string, PlayerDevice>();
const tabChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(TAB_CHANNEL_NAME) : null;

export const playerDevices = signal<PlayerDevice[]>([]);
export const activePlayerDeviceId = signal<string | null>(null);
export const playingAnywhere = signal(false);

let initialized = false;
let applyingRemote = false;
let lastPositionSent = 0;
let positionTimer: number | null = null;
let pendingTransfer: {
    targetDeviceId: string;
    resume: PlayerState;
    timeout: number;
} | null = null;
let lastTransferFrom: { sourceDeviceId: string; at: number } | null = null;
let queueRevision = 0;
let queueRequestId: string | null = null;
let queueChosenDeviceId: string | null = null;
let queueOfferTimeout: number | null = null;
let queueSyncTimeout: number | null = null;

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
        activeDeviceId: activePlayerDeviceId.value,
        queueRevision,
        queue: {
            manual: [...manualQueue.value],
            context: [...contextQueue.value],
            auto: [...autoQueue.value],
        },
    };
}

function emptyQueue(): PlayerQueue {
    return {manual: [], context: [], auto: []};
}

function applyQueue(queue: PlayerQueue, revision: number = queueRevision) {
    const wasApplyingRemote = applyingRemote;
    applyingRemote = true;
    QueueManager.setManualQueue(queue.manual);
    QueueManager.setContextQueue(queue.context);
    QueueManager.setAutoQueue(queue.auto);
    applyingRemote = wasApplyingRemote;
    queueRevision = Math.max(queueRevision, revision);
}

function markQueueChanged() {
    if (applyingRemote) {
        return;
    }
    queueRevision = Math.max(Date.now(), queueRevision + 1);
    scheduleState();
}

function isQueueEmpty(queue: PlayerQueue): boolean {
    return queue.manual.length === 0 && queue.context.length === 0 && queue.auto.length === 0;
}

function activeRemoteDeviceId(): string | null {
    const id = activePlayerDeviceId.value;
    return id && id !== localDeviceId && remoteDevices.has(id) ? id : null;
}

function refreshDevices() {
    if (!currentUser.value) {
        remoteDevices.clear();
        activePlayerDeviceId.value = null;
        playerDevices.value = [];
        playingAnywhere.value = playingHere.value;
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
    }
    const local = {
        ...currentState(),
        lastSeen: now,
        local: true,
    };
    playerDevices.value = [local, ...remoteDevices.values()];
    playingAnywhere.value = local.playing || [...remoteDevices.values()].some(device => device.playing);
}

function publishState() {
    if (!currentUser.value) {
        refreshDevices();
        return;
    }
    const state = currentState();
    eventBus.send({type: "player:state", payload: state});
    tabChannel?.postMessage({type: "player:state", payload: state, timestamp: Date.now()});
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
        loadingAudio.value = false;
        refreshDevices();
    }
}

function cancelPendingTransfer() {
    if (pendingTransfer) {
        clearTimeout(pendingTransfer.timeout);
        pendingTransfer = null;
    }
}

async function handleTransfer(payload: PlayerTransfer) {
    if (payload.targetDeviceId !== localDeviceId || !payload.trackId) {
        return;
    }

    const now = Date.now();
    if (lastTransferFrom?.sourceDeviceId === payload.sourceDeviceId && now - lastTransferFrom.at < 2000) {
        return;
    }
    lastTransferFrom = {sourceDeviceId: payload.sourceDeviceId, at: now};

    cancelPendingTransfer();
    activePlayerDeviceId.value = localDeviceId;
    applyQueue(payload.queue ?? emptyQueue(), payload.queueRevision ?? queueRevision);

    if (payload.playing) {
        await PlayManager.startAsync(payload.trackId, true);
        const relative = relativePosition(payload);
        if (relative > 0) {
            await PlayManager.scrubTo(payload.trackId, relative);
        }
    } else {
        if (playingHere.value) {
            await PlayManager.pauseAsync(currentTrackId.value);
        }
        currentTrackId.value = payload.trackId;
        setTrackPosition(payload);
        await PlayManager.initializeTrackAsync(payload.trackId);
        loadingAudio.value = false;
    }
    publishState();
}

async function handleCommand(command: PlayerCommand) {
    if (command.targetDeviceId !== localDeviceId) {
        return;
    }

    switch (command.action) {
        case "pause":
            if (playingHere.value) {
                await PlayManager.pauseAsync(currentTrackId.value);
            }
            break;
        case "play":
            if (!playingHere.value && currentTrackId.value) {
                await PlayManager.togglePlayAsync(currentTrackId.value);
            }
            break;
        case "seek":
            if (command.position !== undefined && currentTrackId.value) {
                await PlayManager.scrubTo(currentTrackId.value, command.position);
            }
            break;
        case "next":
            await PlayManager.playNextFromQueues(currentTrackId.value);
            break;
        case "previous":
            await PlayManager.playPreviousFromQueues();
            break;
    }
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

    if (state.queueRevision > queueRevision) {
        applyQueue(state.queue ?? emptyQueue(), state.queueRevision);
    }

    if (state.playing) {
        activePlayerDeviceId.value = state.deviceId;
        if (pendingTransfer?.targetDeviceId === state.deviceId) {
            cancelPendingTransfer();
        }
        if (playingHere.value) {
            await PlayManager.pauseAsync(currentTrackId.value);
        }
        await applyRemoteState(state);
    } else if (state.activeDeviceId === state.deviceId || activePlayerDeviceId.value === state.deviceId) {
        activePlayerDeviceId.value = state.deviceId;
        await applyRemoteState(state);
    }

    refreshDevices();
}

function clearQueueTimers() {
    if (queueOfferTimeout !== null) {
        clearTimeout(queueOfferTimeout);
        queueOfferTimeout = null;
    }
    if (queueSyncTimeout !== null) {
        clearTimeout(queueSyncTimeout);
        queueSyncTimeout = null;
    }
}

function cancelQueueRequest() {
    clearQueueTimers();
    queueRequestId = null;
    queueChosenDeviceId = null;
}

function fallbackToLocalQueue(requestId: string, afterSyncTimeout: boolean = false) {
    if (queueRequestId !== requestId || (!afterSyncTimeout && queueChosenDeviceId)) {
        return;
    }
    cancelQueueRequest();
    void QueueManager.fillAutoQueue();
}

function requestQueues() {
    if (!currentUser.value) {
        return;
    }
    cancelQueueRequest();
    const requestId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    queueRequestId = requestId;
    const payload: PlayerQueueProbe = {deviceId: localDeviceId, requestId};
    eventBus.send({type: "player:queue:probe", payload});
    tabChannel?.postMessage({type: "player:queue:probe", payload, timestamp: Date.now()});
    queueOfferTimeout = window.setTimeout(() => fallbackToLocalQueue(requestId), QUEUE_OFFER_TIMEOUT_MS);
}

function handleQueueProbe(payload: PlayerQueueProbe) {
    if (payload.deviceId === localDeviceId) {
        return;
    }
    const offer: PlayerQueueOffer = {
        deviceId: localDeviceId,
        targetDeviceId: payload.deviceId,
        requestId: payload.requestId,
    };
    eventBus.send({type: "player:queue:offer", payload: offer});
    tabChannel?.postMessage({type: "player:queue:offer", payload: offer, timestamp: Date.now()});
}

function handleQueueOffer(payload: PlayerQueueOffer) {
    if (payload.targetDeviceId !== localDeviceId ||
        payload.deviceId === localDeviceId ||
        payload.requestId !== queueRequestId ||
        queueChosenDeviceId) {
        return;
    }
    queueChosenDeviceId = payload.deviceId;
    if (queueOfferTimeout !== null) {
        clearTimeout(queueOfferTimeout);
        queueOfferTimeout = null;
    }
    const sync: PlayerQueueSync = {
        deviceId: localDeviceId,
        targetDeviceId: payload.deviceId,
        requestId: payload.requestId,
    };
    eventBus.send({type: "player:queue:sync", payload: sync});
    tabChannel?.postMessage({type: "player:queue:sync", payload: sync, timestamp: Date.now()});
    queueSyncTimeout = window.setTimeout(
        () => fallbackToLocalQueue(payload.requestId, true),
        QUEUE_SYNC_TIMEOUT_MS,
    );
}

function handleQueueSync(payload: PlayerQueueSync) {
    if (payload.targetDeviceId !== localDeviceId) {
        return;
    }
    const state = currentState();
    const snapshot: PlayerQueueSnapshot = {
        deviceId: localDeviceId,
        targetDeviceId: payload.deviceId,
        requestId: payload.requestId,
        queue: state.queue,
        queueRevision: state.queueRevision,
    };
    eventBus.send({type: "player:queue:snapshot", payload: snapshot});
    tabChannel?.postMessage({type: "player:queue:snapshot", payload: snapshot, timestamp: Date.now()});
}

function handleQueueSnapshot(payload: PlayerQueueSnapshot) {
    if (payload.targetDeviceId !== localDeviceId ||
        payload.requestId !== queueRequestId ||
        (queueChosenDeviceId && payload.deviceId !== queueChosenDeviceId)) {
        return;
    }
    cancelQueueRequest();
    if (payload.queueRevision >= queueRevision) {
        applyQueue(payload.queue, payload.queueRevision);
    }
    if (isQueueEmpty(currentState().queue)) {
        void QueueManager.fillAutoQueue();
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
                void handleTransfer({
                    ...event.payload,
                    sourceDeviceId: event.payload.sourceDeviceId ?? event.payload.deviceId,
                });
            } else if (event.type === "player:command") {
                void handleCommand(event.payload);
            } else if (event.type === "player:request") {
                publishState();
            } else if (event.type === "player:queue:probe") {
                handleQueueProbe(event.payload);
            } else if (event.type === "player:queue:offer") {
                handleQueueOffer(event.payload);
            } else if (event.type === "player:queue:sync") {
                handleQueueSync(event.payload);
            } else if (event.type === "player:queue:snapshot") {
                handleQueueSnapshot(event.payload);
            }
        });

        if (tabChannel) {
            tabChannel.onmessage = event => {
                if (event.data?.type === "player:state" && event.data.payload?.deviceId) {
                    void handleState(event.data.payload, event.data.timestamp ?? Date.now());
                } else if (event.data?.type === "player:transfer" && event.data.payload?.deviceId) {
                    void handleTransfer({
                        ...event.data.payload,
                        sourceDeviceId: event.data.payload.deviceId,
                    });
                } else if (event.data?.type === "player:command") {
                    void handleCommand(event.data.payload);
                } else if (event.data?.type === "player:request") {
                    publishState();
                } else if (event.data?.type === "player:queue:probe") {
                    handleQueueProbe(event.data.payload);
                } else if (event.data?.type === "player:queue:offer") {
                    handleQueueOffer(event.data.payload);
                } else if (event.data?.type === "player:queue:sync") {
                    handleQueueSync(event.data.payload);
                } else if (event.data?.type === "player:queue:snapshot") {
                    handleQueueSnapshot(event.data.payload);
                }
            };
        }

        currentTrackId.subscribe(() => {
            if (!applyingRemote) {
                scheduleState();
            }
        });
        manualQueue.subscribe(markQueueChanged);
        contextQueue.subscribe(markQueueChanged);
        autoQueue.subscribe(markQueueChanged);
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
                cancelPendingTransfer();
            }
            publishState();
        });
        currentUser.subscribe(user => {
            if (!user) {
                cancelQueueRequest();
                refreshDevices();
                return;
            }
            publishState();
            requestQueues();
        });

        setInterval(() => {
            publishState();
            refreshDevices();
        }, HEARTBEAT_MS);
        setInterval(refreshDevices, HEARTBEAT_MS);
        refreshDevices();
        if (currentUser.value) {
            requestQueues();
        }
    }

    static hasActiveRemote() {
        return activeRemoteDeviceId() !== null;
    }

    static playRemote() {
        const targetDeviceId = activeRemoteDeviceId();
        if (!targetDeviceId) {
            return;
        }
        PlayerSync.sendCommand({
            deviceId: localDeviceId,
            targetDeviceId,
            action: "play",
        });
    }

    static pauseRemote() {
        const targetDeviceId = activeRemoteDeviceId();
        if (!targetDeviceId) {
            return;
        }
        PlayerSync.sendCommand({
            deviceId: localDeviceId,
            targetDeviceId,
            action: "pause",
        });
    }

    static next() {
        const targetDeviceId = activeRemoteDeviceId();
        if (targetDeviceId) {
            PlayerSync.sendCommand({
                deviceId: localDeviceId,
                targetDeviceId,
                action: "next",
            });
            return;
        }
        PlayManager.playNextFromQueues(currentTrackId.value).then();
    }

    static previous() {
        const targetDeviceId = activeRemoteDeviceId();
        if (targetDeviceId) {
            PlayerSync.sendCommand({
                deviceId: localDeviceId,
                targetDeviceId,
                action: "previous",
            });
            return;
        }
        PlayManager.playPreviousFromQueues().then();
    }

    static seekRemote(position: number) {
        const targetDeviceId = activeRemoteDeviceId();
        if (!targetDeviceId) {
            return;
        }
        PlayerSync.sendCommand({
            deviceId: localDeviceId,
            targetDeviceId,
            action: "seek",
            position: Math.min(Math.max(position, 0), 1),
        });
    }

    static async seekFromElement(event: MouseEvent, trackId: number, version?: number) {
        if (activeRemoteDeviceId()) {
            const rect = (event.target as HTMLElement).getBoundingClientRect();
            const relative = Math.min(Math.max(event.offsetX / rect.width, 0), 1);
            const duration = PlayManager.getDuration(trackId);
            currentTrackPosition.value = {relative, absolute: relative * duration};
            PlayerSync.seekRemote(relative);
            return;
        }
        await PlayManager.scrubFromElement(event, trackId, version);
    }

    private static sendCommand(command: PlayerCommand) {
        eventBus.send({type: "player:command", payload: command});
        tabChannel?.postMessage({type: "player:command", payload: command, timestamp: Date.now()});
    }

    static async claimPlayback() {
        if (playingHere.value || !currentTrackId.value) {
            return;
        }
        const relative = currentTrackPosition.value.relative;
        await PlayManager.startAsync(currentTrackId.value, true);
        if (relative > 0) {
            await PlayManager.scrubTo(currentTrackId.value, relative);
        }
    }

    static async transferTo(targetDeviceId: string) {
        if (targetDeviceId === localDeviceId) {
            await PlayerSync.claimPlayback();
            return;
        }
        if (!remoteDevices.has(targetDeviceId)) {
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
        const payload: PlayerTransfer = {
            ...resume,
            sourceDeviceId: localDeviceId,
            targetDeviceId,
        };
        eventBus.send({
            type: "player:transfer",
            payload,
        });
        tabChannel?.postMessage({
            type: "player:transfer",
            payload,
            timestamp: Date.now(),
        });
        if (playingHere.value) {
            await PlayManager.pauseAsync(currentTrackId.value);
        }
    }
}
