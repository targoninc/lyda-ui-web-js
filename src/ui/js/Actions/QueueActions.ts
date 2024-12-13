import {Api} from "../Api/Api.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";

export class QueueActions {
    static async getNewAutoQueueTracks() {
        const response = await Api.getAsync<any[]>(ApiRoutes.autoQueueFeed);
        return response.data;
    }
}