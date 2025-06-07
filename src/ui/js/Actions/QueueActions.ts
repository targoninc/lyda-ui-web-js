import {HttpClient} from "../Api/HttpClient.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";

export class QueueActions {
    static async getNewAutoQueueTracks() {
        const response = await HttpClient.getAsync<any[]>(ApiRoutes.autoQueueFeed);
        return response.data;
    }
}