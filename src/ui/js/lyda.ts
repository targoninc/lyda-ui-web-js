import {PlayManager} from "./Streaming/PlayManager.ts";
import {UserTemplates} from "./Templates/account/UserTemplates.ts";
import {TrackTemplates} from "./Templates/music/TrackTemplates.ts";
import {PlaylistTemplates} from "./Templates/music/PlaylistTemplates.ts";
import {LibraryActions} from "./Actions/LibraryActions.ts";
import {HttpClient} from "./Api/HttpClient.ts";
import {StatisticTemplates} from "./Templates/StatisticTemplates.ts";
import {SubscriptionTemplates} from "./Templates/SubscriptionTemplates.ts";
import {notify} from "./Classes/Ui.ts";
import {navigate} from "./Routing/Router.ts";
import {ApiRoutes} from "./Api/ApiRoutes.ts";
import {currentSecretCode, currentUser} from "./state.ts";
import {RoutePath} from "./Routing/routes.ts";
import { AnyElement } from "@targoninc/jess";
import {NotificationType} from "./Enums/NotificationType.ts";
import {RoyaltyInfo} from "@targoninc/lyda-shared/src/Models/RoyaltyInfo";
import {LydaApi} from "./Api/LydaApi.ts";

export class Lyda {
    static async getEndpointData(endpoint: string, params = "") {
        let r = await HttpClient.getAsync<any>(endpoint + params);
        if (r.code !== 200) {
            console.error("Failed to fetch from endpoint " + endpoint + ", status: " + r.code);
            return {
                error: "Failed to fetch from endpoint " + endpoint + ", status: " + r.code,
                status: r.code
            };
        }
        return r.data;
    }

    static async initPage(params: any) {
        let elements = document.querySelectorAll("[lyda]") as NodeListOf<AnyElement>;
        for (const element of elements) {
            await Lyda.loadPagePart(element, params);
        }
    }

    static async loadPagePart(element: AnyElement, params: any) {
        const endpoint = element.getAttribute("endpoint");
        const neededParams = element.getAttribute("params");
        let paramsString = "";
        if (neededParams) {
            for (let param of neededParams.split(",")) {
                paramsString += `&${param}=${params[param]}`;
            }
            paramsString = paramsString.substring(1);
            paramsString = `?${paramsString}`;
        }
        let data;
        if (endpoint !== null) {
            data = await Lyda.getEndpointData(endpoint, paramsString);
        }
        const user = currentUser.value;

        switch (element.getAttribute("datatype")) {
            case "track":
                if (data.error) {
                    notify(data.error, NotificationType.error);
                    return;
                }
                document.title = data.track.title;
                currentSecretCode.value = params.code;
                await PlayManager.cacheTrackData(data);
                const trackPage = await TrackTemplates.trackPage(data);
                if (!trackPage) {
                    return;
                }
                element.appendChild(trackPage);
                if (data.error) {
                    element.innerHTML = data.error;
                    return;
                }
                break;
            case "playlist":
                if (!user) {
                    navigate(RoutePath.explore);
                    return;
                }
                document.title = data.playlist.title;
                element.appendChild(await PlaylistTemplates.playlistPage(data, user));
                if (data.error) {
                    element.innerHTML = data.error;
                    return;
                }
                break;
            case "statistics":
                if (!user) {
                    navigate(RoutePath.explore);
                    return;
                }
                const royaltyInfo = await HttpClient.getAsync<RoyaltyInfo>(ApiRoutes.getRoyaltyInfo);
                element.append(StatisticTemplates.artistRoyaltyActions(royaltyInfo.data));
                element.append(await StatisticTemplates.allStats());
                element.append(StatisticTemplates.dataExport());
                break;
            case "library":
                if (!user) {
                    notify("You need to be logged in to view your library", NotificationType.error);
                    navigate(RoutePath.login);
                    return;
                }
                const name = params.name ?? "";
                document.title = "Library - " + name;
                const library = await LibraryActions.getLibrary(name);
                if (!library) {
                    element.appendChild(UserTemplates.notPublicLibrary(name));
                    return;
                }
                const page = UserTemplates.libraryPage(library.albums, library.playlists, library.tracks);
                element.appendChild(page);
                break;
            case "unapprovedTracks":
                if (!user) {
                    notify("You need to be logged in to see unapproved tracks", NotificationType.error);
                    navigate(RoutePath.login);
                    return;
                }
                LydaApi.getUnapprovedTracks().then(tracks => {
                    element.appendChild(TrackTemplates.unapprovedTracks(tracks, user));
                });
                break;
            case "moderation":
                break;
            case "subscribe":
                if (!user) {
                    notify("You can only subscribe if you have an account already", NotificationType.warning);
                    navigate(RoutePath.login);
                    return;
                }
                element.appendChild(SubscriptionTemplates.page());
                break;
            default:
                element.innerHTML = JSON.stringify(data, null, 2);
                break;
        }
    }
}