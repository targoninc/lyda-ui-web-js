import {Api, ApiRoutes} from "../Classes/Api.ts";

export class QueueActions {
    static async getNewAutoQueueTracks() {
        const response = await Api.getAsync(ApiRoutes.autoQueueFeed);
        return response.data;
    }
}