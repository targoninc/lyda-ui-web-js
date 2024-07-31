import {Api} from "../Classes/Api.mjs";

export class QueueActions {
    static async getNewAutoQueueTracks() {
        const response = await fetch(Api.endpoints.tracks.feeds.autoQueue);
        return await response.json();
    }
}