import {LydaCache} from "../Cache/LydaCache.ts";
import {autoQueue, contextQueue, manualQueue, setTrackInfo, trackInfo} from "../state.ts";
import {Api} from "../Api/Api.ts";
import {PlayingFrom} from "@targoninc/lyda-shared/src/Models/PlayingFrom";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {shuffleArray} from "../Classes/Util.ts";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import {isPlayableTrack} from "../Classes/Helpers/PlayableTrack.ts";

function resolveFeedResult(result: any): any[] {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (result.items) return result.items;
    return [];
}

export class QueueManager {
    static lastPopulatedShuffleState: boolean | null = null;

    static isPlayableId(id: number): boolean {
        const track = trackInfo.value[id]?.track as Track | undefined;
        return !track || isPlayableTrack(track);
    }

    private static filterPlayableIds(queue: number[]): number[] {
        return queue.filter(id => QueueManager.isPlayableId(id));
    }

    static addToAutoQueue(id: number) {
        if (!QueueManager.isPlayableId(id)) {
            return;
        }
        autoQueue.value.push(id);
    }

    static setAutoQueue(queue: number[]) {
        autoQueue.value = QueueManager.filterPlayableIds(queue);
    }

    static setManualQueue(queue: number[]) {
        manualQueue.value = QueueManager.filterPlayableIds(queue);
    }

    static addToManualQueue(id: number, track?: Track) {
        if (!id) {
            return;
        }
        if (track && !isPlayableTrack(track)) {
            return;
        }
        if (!track && !QueueManager.isPlayableId(id)) {
            return;
        }
        if (track && !trackInfo.value[id]) {
            setTrackInfo(id, {track});
        }
        manualQueue.value = [...new Set([...manualQueue.value, id])];
    }

    static clearAutoQueue() {
        autoQueue.value = [];
    }

    static setContextQueue(queue: number[]) {
        contextQueue.value = QueueManager.filterPlayableIds(queue);
    }

    static clearContextQueue() {
        contextQueue.value = [];
    }

    static async populateContextQueue(pf: PlayingFrom, shuffle: boolean) {
        if (pf.entity?.tracks) {
            let trackIds = pf.entity.tracks
                .filter(t => !t.track || isPlayableTrack(t.track))
                .map(t => t.track_id);
            if (shuffle) {
                trackIds = shuffleArray(trackIds);
            }
            contextQueue.value = trackIds;
            QueueManager.lastPopulatedShuffleState = shuffle;
            return;
        }

        if (!pf.type) return;

        const params: Record<string, any> = { limit: 100 };
        if (pf.id) params.id = pf.id;
        if (shuffle) params.shuffle = true;
        if (pf.wip) params.wip = pf.wip;

        const result = await Api.getFeed(`${ApiRoutes.trackFeed}/${pf.type}`, params);
        if (!result) return;

        const tracks = resolveFeedResult(result);
        if (tracks.length === 0) return;

        for (const track of tracks) {
            if (track?.id && !trackInfo.value[track.id]) {
                setTrackInfo(track.id, {track});
            }
        }

        let trackIds = tracks
            .filter((t: any) => isPlayableTrack(t))
            .map((t: any) => t.id);
        if (shuffle) {
            trackIds = shuffleArray(trackIds);
        }
        contextQueue.value = trackIds;
        QueueManager.lastPopulatedShuffleState = shuffle;
    }

    static reshuffleContextQueue() {
        const current = QueueManager.getContextQueue();
        if (current.length > 0) {
            contextQueue.value = shuffleArray(current);
        }
    }

    static async popFromAutoQueue() {
        let autoQueueTmp = QueueManager.getAutoQueue().filter(id => QueueManager.isPlayableId(id));
        let firstItem = autoQueueTmp[0];

        if (firstItem === undefined || autoQueueTmp.length < 10) {
            autoQueueTmp = (await QueueManager.fillAutoQueue()).filter(id => QueueManager.isPlayableId(id));
            firstItem = autoQueueTmp[0];
            if (firstItem === undefined) {
                return undefined;
            }
        }

        autoQueueTmp = autoQueueTmp.slice(1);
        autoQueue.value = autoQueueTmp;
        return firstItem;
    }

    static async fillAutoQueue() {
        if (autoQueue.value.length > 10) {
            return autoQueue.value;
        }
        const queueToAdd = await Api.getNewAutoQueueTracks();
        for (const track of queueToAdd) {
            if (track?.id && !trackInfo.value[track.id]) {
                setTrackInfo(track.id, {track});
            }
        }
        const ids = queueToAdd
            .filter((item) => isPlayableTrack(item))
            .map((item) => item.id);
        autoQueue.value = QueueManager.filterPlayableIds(autoQueue.value.concat(ids));
        return autoQueue.value;
    }

    static removeFromManualQueue(id: number) {
        manualQueue.value = manualQueue.value.filter((queueId) => queueId !== id);
    }

    static removeIndexFromManualQueue(index: number) {
        manualQueue.value = manualQueue.value.filter((_, i) => index !== i);
    }

    static removeFromAllQueues(id: number) {
        manualQueue.value = manualQueue.value.filter((queueId) => queueId !== id);
        contextQueue.value = contextQueue.value.filter((queueId) => queueId !== id);
        autoQueue.value = autoQueue.value.filter((queueId) => queueId !== id);
    }

    static toggleInManualQueue(id: number) {
        if (QueueManager.isInManualQueue(id)) {
            QueueManager.removeFromManualQueue(id);
        } else {
            QueueManager.addToManualQueue(id);
        }
    }

    static getAutoQueue() {
        let autoQueueTmp = QueueManager.filterPlayableIds(autoQueue.value);
        if (autoQueueTmp.length === 0) {
            const cache = LydaCache.get<number[] | number>("queue").content;
            if (cache) {
                autoQueueTmp = QueueManager.filterPlayableIds((Array.isArray(cache) ? cache : [cache]) as number[]);
                autoQueue.value = autoQueueTmp;
            }
        }
        return autoQueueTmp;
    }

    static getContextQueue() {
        let contextQueueTmp = QueueManager.filterPlayableIds(contextQueue.value);
        if (contextQueueTmp.length === 0) {
            const cache = LydaCache.get<number[] | number>("contextQueue").content;
            if (cache) {
                contextQueueTmp = QueueManager.filterPlayableIds((Array.isArray(cache) ? cache : [cache]) as number[]);
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
    }
}
