import {StreamingUpdater} from "./StreamingUpdater.mjs";
import {LydaCache} from "../Cache/LydaCache.ts";
import {PlayManager} from "./PlayManager.mjs";
import {QueueActions} from "../Actions/QueueActions.ts";

export class QueueManager {
    static addToAutoQueue(id) {
        PlayManager.ensureWindowObjects();
        window.autoQueue.push(id);

        StreamingUpdater.updateQueue().then();
    }

    static getAutoQueue() {
        PlayManager.ensureWindowObjects();
        let autoQueue = window.autoQueue;
        if (autoQueue.length === 0) {
            let cache = LydaCache.get("queue").content;
            if (cache) {
                if (cache.constructor !== Array) {
                    cache = [cache];
                }
                autoQueue = cache;
                window.autoQueue = autoQueue;
            }
        }
        return autoQueue;
    }

    static setAutoQueue(queue) {
        PlayManager.ensureWindowObjects();
        window.autoQueue = queue;

        StreamingUpdater.updateQueue().then();
    }

    static addToManualQueue(id) {
        if (!id) {
            return;
        }
        PlayManager.ensureWindowObjects();
        window.manualQueue.push(id);

        StreamingUpdater.updateQueue().then();
    }

    static clearAutoQueue() {
        PlayManager.ensureWindowObjects();
        window.autoQueue = [];

        StreamingUpdater.updateQueue().then();
    }

    static setContextQueue(queue) {
        PlayManager.ensureWindowObjects();
        window.contextQueue = queue;

        StreamingUpdater.updateQueue().then();
    }

    static getContextQueue() {
        PlayManager.ensureWindowObjects();
        let contextQueue = window.contextQueue;
        if (contextQueue.length === 0) {
            let cache = LydaCache.get("contextQueue").content;
            if (cache) {
                if (cache.constructor !== Array) {
                    cache = [cache];
                }
                contextQueue = cache;
                window.contextQueue = contextQueue;
            }
        }
        return contextQueue;
    }

    static clearContextQueue() {
        PlayManager.ensureWindowObjects();
        window.contextQueue = [];

        StreamingUpdater.updateQueue().then();
    }

    static async popFromAutoQueue() {
        PlayManager.ensureWindowObjects();
        let autoQueue = QueueManager.getAutoQueue();
        let firstItem = autoQueue[0];

        if (firstItem === undefined) {
            await QueueManager.fillAutoQueue();
            firstItem = autoQueue[0];
            if (firstItem === undefined) {
                return undefined;
            }
        }

        autoQueue = autoQueue.slice(1);
        window.autoQueue = autoQueue;

        StreamingUpdater.updateQueue().then();
        return firstItem;
    }

    static async fillAutoQueue() {
        PlayManager.ensureWindowObjects();
        const queueToAdd = await QueueActions.getNewAutoQueueTracks();
        window.autoQueue = window.autoQueue.concat(queueToAdd);

        StreamingUpdater.updateQueue().then();
    }

    static getNextTrackInContextQueue(currentId) {
        PlayManager.ensureWindowObjects();
        const index = window.contextQueue.findIndex(id => id === currentId);
        if (index === -1) {
            return null;
        }
        return window.contextQueue[index + 1];
    }

    static removeFromManualQueue(id) {
        PlayManager.ensureWindowObjects();
        window.manualQueue = window.manualQueue.filter((queueId) => queueId !== id);

        StreamingUpdater.updateQueue().then();
    }

    static toggleInManualQueue(id) {
        if (QueueManager.isInManualQueue(id)) {
            QueueManager.removeFromManualQueue(id);
        } else {
            QueueManager.addToManualQueue(id);
        }
    }

    static getManualQueue() {
        PlayManager.ensureWindowObjects();
        let manualQueue = window.manualQueue;
        if (manualQueue.length === 0) {
            let cache = LydaCache.get("manualQueue").content;
            if (cache) {
                if (cache.constructor !== Array) {
                    cache = [cache];
                }
                manualQueue = cache;
                window.manualQueue = manualQueue;
            }
        }
        manualQueue.filter(id => id !== undefined && id !== null);
        return manualQueue;
    }

    static isInManualQueue(id) {
        PlayManager.ensureWindowObjects();
        const manualQueue = QueueManager.getManualQueue();
        return manualQueue.includes(id);
    }

    static moveInManualQueue(index, newIndex) {
        PlayManager.ensureWindowObjects();
        const queue = QueueManager.getManualQueue();
        const item = queue[index];
        queue.splice(index, 1);
        queue.splice(newIndex, 0, item);
        StreamingUpdater.updateQueue().then();
    }
}