import {StreamingUpdater} from "./StreamingUpdater.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {autoQueue, contextQueue, manualQueue} from "../state.ts";
import {Api} from "../Api/Api.ts";

export class QueueManager {
    static addToAutoQueue(id: number) {
        autoQueue.value.push(id);

        StreamingUpdater.updateQueue().then();
    }

    static setAutoQueue(queue: number[]) {
        autoQueue.value = queue;

        StreamingUpdater.updateQueue().then();
    }

    static addToManualQueue(id: number) {
        if (!id) {
            return;
        }
        manualQueue.value = [...new Set([...manualQueue.value, id])];

        StreamingUpdater.updateQueue().then();
    }

    static clearAutoQueue() {
        autoQueue.value = [];

        StreamingUpdater.updateQueue().then();
    }

    static setContextQueue(queue: number[]) {
        contextQueue.value = queue;

        StreamingUpdater.updateQueue().then();
    }

    static clearContextQueue() {
        contextQueue.value = [];

        StreamingUpdater.updateQueue().then();
    }

    static async popFromAutoQueue() {
        let autoQueueTmp = QueueManager.getAutoQueue();
        let firstItem = autoQueueTmp[0];

        if (firstItem === undefined || autoQueueTmp.length < 10) {
            autoQueueTmp = await QueueManager.fillAutoQueue();
            firstItem = autoQueueTmp[0];
            if (firstItem === undefined) {
                return undefined;
            }
        }

        autoQueueTmp = autoQueueTmp.slice(1);
        autoQueue.value = autoQueueTmp;

        StreamingUpdater.updateQueue().then();
        return firstItem;
    }

    static async fillAutoQueue() {
        if (autoQueue.value.length > 10) {
            return autoQueue.value;
        }
        const queueToAdd = await Api.getNewAutoQueueTracks();
        const ids = queueToAdd.map((item) => item.id);
        autoQueue.value = autoQueue.value.concat(ids);

        StreamingUpdater.updateQueue().then();
        return autoQueue.value;
    }

    static getNextTrackInContextQueue(currentId: number) {
        const index = contextQueue.value.findIndex(id => id === currentId);
        if (index === -1) {
            return null;
        }
        return contextQueue.value[index + 1];
    }

    static removeFromManualQueue(id: number) {
        manualQueue.value = manualQueue.value.filter((queueId) => queueId !== id);

        StreamingUpdater.updateQueue().then();
    }

    static removeIndexFromManualQueue(index: number) {
        manualQueue.value = manualQueue.value.filter((_, i) => index !== i);

        StreamingUpdater.updateQueue().then();
    }

    static removeFromAllQueues(id: number) {
        manualQueue.value = manualQueue.value.filter((queueId) => queueId !== id);
        contextQueue.value = contextQueue.value.filter((queueId) => queueId !== id);
        autoQueue.value = autoQueue.value.filter((queueId) => queueId !== id);

        StreamingUpdater.updateQueue().then();
    }

    static toggleInManualQueue(id: number) {
        if (QueueManager.isInManualQueue(id)) {
            QueueManager.removeFromManualQueue(id);
        } else {
            QueueManager.addToManualQueue(id);
        }
    }

    static getAutoQueue() {
        let autoQueueTmp = autoQueue.value;
        if (autoQueueTmp.length === 0) {
            let cache = LydaCache.get<number[] | number>("queue").content;
            if (cache) {
                autoQueueTmp = ((cache as any[]).length ? cache : [cache]) as number[];
                autoQueue.value = autoQueueTmp;
            }
        }
        return autoQueueTmp;
    }

    static getContextQueue() {
        let contextQueueTmp = contextQueue.value;
        if (contextQueueTmp.length === 0) {
            let cache = LydaCache.get<number[] | number>("contextQueue").content;
            if (cache) {
                contextQueueTmp = ((cache as any[]).length ? cache : [cache]) as number[];
                contextQueue.value = contextQueueTmp;
            }
        }
        return contextQueueTmp;
    }

    static getManualQueue(): number[] {
        return [...manualQueue.value];
    }

    static isInManualQueue(id: number) {
        const manualQueue = QueueManager.getManualQueue();
        return manualQueue.includes(id);
    }

    static moveInManualQueue(index: number, newIndex: number) {
        const queue = QueueManager.getManualQueue();
        const item = queue[index];
        queue.splice(index, 1);
        queue.splice(newIndex, 0, item);
        manualQueue.value = queue;
        StreamingUpdater.updateQueue().then();
    }
}