import {Api} from "../Classes/Api.ts";
import {ApiRoutes} from "../Classes/ApiRoutes.ts";

export class QueueActions {
    static async getNewAutoQueueTracks() {
        const response = await Api.getAsync(ApiRoutes.autoQueueFeed);
        return response.data;
    }
}