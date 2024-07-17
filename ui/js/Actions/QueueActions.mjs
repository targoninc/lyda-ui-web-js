import {Util} from "../Classes/Util.mjs";
import {Api} from "../Classes/Api.mjs";

export class QueueActions {
    static async getNewAutoQueueTracks() {
        const response = await fetch(Api.endpoints.tracks.feeds.autoQueue, {
            headers: Util.getAuthorizationHeaders()
        });
        return await response.json();
    }
}