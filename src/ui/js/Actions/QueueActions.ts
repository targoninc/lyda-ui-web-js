import {Api} from "../Classes/Api.ts";

export class QueueActions {
    static async getNewAutoQueueTracks() {
        const response = await fetch(Api.endpoints.tracks.feeds.autoQueue, {
            method: "GET",
            mode: "cors",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });
        return await response.json();
    }
}