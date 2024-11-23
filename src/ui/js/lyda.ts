import {LydaCache} from "./Cache/LydaCache.ts";
import {Config} from "./Classes/Config.ts";
import {PlayManager} from "./Streaming/PlayManager.ts";
import {CacheItem} from "./Cache/CacheItem.ts";
import {UserTemplates} from "./Templates/UserTemplates.ts";
import {SettingsTemplates} from "./Templates/SettingsTemplates.ts";
import {TrackEditTemplates} from "./Templates/TrackEditTemplates.ts";
import {TrackTemplates} from "./Templates/TrackTemplates.ts";
import {ProfilePage} from "./Classes/ProfilePage.ts";
import {AlbumTemplates} from "./Templates/AlbumTemplates.ts";
import {PlaylistTemplates} from "./Templates/PlaylistTemplates.ts";
import {LibraryActions} from "./Actions/LibraryActions.ts";
import {Api} from "./Api/Api.ts";
import {StatisticTemplates} from "./Templates/StatisticTemplates.ts";
import {LogTemplates} from "./Templates/LogTemplates.ts";
import {Permissions} from "./Enums/Permissions.ts";
import {LydaApi} from "./Api/LydaApi.ts";
import {TrackActions} from "./Actions/TrackActions.ts";
import {CommentActions} from "./Actions/CommentActions.ts";
import {CommentTemplates} from "./Templates/CommentTemplates.ts";
import {SubscriptionTemplates} from "./Templates/SubscriptionTemplates.ts";
import {SubscriptionActions} from "./Actions/SubscriptionActions.ts";
import {Util} from "./Classes/Util.ts";
import {StatisticsWrapper} from "./Classes/StatisticsWrapper.ts";
import {notify, Ui} from "./Classes/Ui.ts";
import {navigate} from "./Routing/Router.ts";
import {Permission} from "./Models/DbModels/Permission.ts";
import {Follow} from "./Models/DbModels/Follow.ts";
import {AnyElement, create, signal} from "../fjsc/f2.ts";
import {User} from "./Models/DbModels/User.ts";
import {ApiRoutes} from "./Api/ApiRoutes.ts";

export class Lyda {
    static async getEndpointData(endpoint: string, params = "") {
        const cacheItem = LydaCache.get("api/" + endpoint + params).content;
        if (cacheItem) {
            const cacheExpiration = cacheItem.createTime + cacheItem.reFetchTtlInSeconds * 1000;
            if (cacheExpiration > new Date().getTime()) {
                return cacheItem.content;
            }
        }

        let r = await fetch(endpoint + params, {
            method: "GET",
            mode: "cors",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });
        if (r.status !== 200) {
            console.error("Failed to fetch from endpoint " + endpoint + ", status: " + r.status);
            return {
                error: "Failed to fetch from endpoint " + endpoint + ", status: " + r.status,
                status: r.status
            };
        }
        let text = await r.text();
        LydaCache.set("api/" + endpoint + params, new CacheItem(text));
        return JSON.parse(text);
    }

    static async initPage(params: any) {
        let elements = document.querySelectorAll("[lyda]") as NodeListOf<AnyElement>;
        for (let element of elements) {
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
        let user: User;
        const permissionData  = await Api.getAsync(ApiRoutes.userPermissions);
        const permissions = permissionData.data;
        switch (element.getAttribute("datatype")) {
        case "uploadForm":
            // @ts-ignore
            element.appendChild(TrackEditTemplates.uploadForm());
            break;
        case "tracks":
            user = await Util.getUserAsync();
            const feedType = element.getAttribute("feedType");
            if (!feedType) {
                throw new Error("Missing feed type");
            }
            this.loadFeed(feedType, element, user).then();
            if (data.error) {
                element.innerHTML = data.error;
                return;
            }
            break;
        case "profile":
            user = data;
            if (user.error) {
                navigate("login");
                return;
            }
            const selfUser = await Util.getUserAsync();
            const isOwnProfile = selfUser ? user.id === selfUser.id : false;
            element.appendChild(UserTemplates.userActionsContainer(isOwnProfile));
            element.appendChild(UserTemplates.profileHeader(user, isOwnProfile));
            const following = user.follows.some((f: Follow) => {
                return selfUser ? f.following_user_id === selfUser.id : false;
            });
            const followsBack = user.following.some(f => {
                return selfUser ? f.user_id === selfUser.id : false;
            });
            element.appendChild(UserTemplates.profileInfo(user, selfUser, isOwnProfile, permissions, following, followsBack));
            ProfilePage.addTabSectionAsync(element, user, selfUser, isOwnProfile).then();
            break;
        case "track":
            await PlayManager.cacheTrackData(data);
            user = await Util.getUserAsync();
            element.appendChild(await TrackTemplates.trackPage(data, user));
            if (data.error) {
                element.innerHTML = data.error;
                return;
            }
            break;
        case "album":
            user = await Util.getUserAsync();
            element.appendChild(await AlbumTemplates.albumPage(data, user));
            if (data.error) {
                element.innerHTML = data.error;
                return;
            }
            break;
        case "playlist":
            user = await Util.getUserAsync();
            element.appendChild(await PlaylistTemplates.playlistPage(data, user));
            if (data.error) {
                element.innerHTML = data.error;
                return;
            }
            break;
        case "settings":
            user = await Util.getUserAsync();
            if (user.error) {
                navigate("login");
                return;
            }
            element.appendChild(SettingsTemplates.settingsPage(user));
            break;
        case "statistics":
            user = await Util.getUserAsync();
            if (user.error) {
                navigate("login");
                return;
            }
            const royaltyInfo = await Api.getAsync(ApiRoutes.getRoyaltyInfo);
            element.append(await StatisticTemplates.statisticActions(user, royaltyInfo.data, permissions));
            element.append(create("div").classes("flex").children(...(await StatisticsWrapper.getStatistics())).build());
            break;
        case "library":
            user = await Util.getUserAsync();
            if (user.error) {
                navigate("login");
                return;
            }
            const name = params.name ?? "";
            const library = await LibraryActions.getLibrary(name);
            if (!library) {
                element.appendChild(UserTemplates.notPublicLibrary(name));
                return;
            }
            const page = UserTemplates.libraryPage(library.albums, library.playlists, library.tracks, user);
            element.appendChild(page);
            break;
        case "logs":
            user = await Util.getUserAsync();
            if (!permissions.some((p: Permission) => p.name === Permissions.canViewLogs)) {
                notify("You do not have permission to view logs", "error");
                return;
            }
            const filterState = signal("all");
            element.appendChild(LogTemplates.logFilters(filterState));
            let logsList = create("div").build();
            element.appendChild(logsList);
            LydaApi.getLogs(filterState, async (logs) => {
                const newLogs = LogTemplates.logs(logs);
                element.replaceChild(newLogs, logsList);
                logsList = newLogs;
            });
            break;
        case "actionLogs":
            user = await Util.getUserAsync();
            if (!permissions.some(p => p.name === Permissions.canViewActionLogs)) {
                notify("You do not have permission to view action logs", "error");
                return;
            }
            const actionLogs = await Api.getAsync(ApiRoutes.getActionLogs);
            element.appendChild(await LogTemplates.actionLogs(user, actionLogs.data));
            break;
        case "unapprovedTracks":
            user = await Util.getUserAsync();
            TrackActions.getUnapprovedTracks().then(tracks => {
                element.appendChild(TrackTemplates.unapprovedTracks(tracks, user));
            });
            break;
        case "moderation":
            user = await Util.getUserAsync();
            if (!permissions.some(p => p.name === Permissions.canDeleteComments)) {
                notify("You do not have permission to moderate", "error");
                return;
            }
            const comments = await CommentActions.getPotentiallyHarmful();
            element.appendChild(await CommentTemplates.moderatableCommentsList(comments, user));
            break;
        case "subscribe":
            user = await Util.getUserAsync();
            if (!user) {
                navigate("login");
                return;
            }
            SubscriptionActions.addPaypalSdkIfNotExists(SubscriptionActions.clientId);
            const options = signal([]);
            SubscriptionActions.loadSubscriptionOptions().then(optionsRes => {
                options.value = optionsRes;
            });
            const currency = "USD";
            element.appendChild(SubscriptionTemplates.page(user, currency, options));
            break;
        default:
            element.innerHTML = JSON.stringify(data, null, 2);
            break;
        }
    }

    static async loadFeed(type: string, element: AnyElement, user: User) {
        const feedMap = {
            following: ApiRoutes.followingFeed,
            explore: ApiRoutes.exploreFeed,
            autoQueue: ApiRoutes.autoQueueFeed,
        };
        const endpoint = feedMap[type as keyof typeof feedMap];
        const pageState = signal(1);
        const tracksState = signal([]);
        const filterState = signal("all");
        const loadingState = signal(false);
        const pageSize = 10;
        const update = async () => {
            const pageNumber = pageState.value;
            const filter = filterState.value;
            const offset = (pageNumber - 1) * pageSize;
            const params = type === "following" ? { offset, filter } : { offset };
            loadingState.value = true;
            const res = await Api.getAsync(endpoint, params);
            if (res.code !== 200) {
                notify("Failed to get tracks", "error");
                loadingState.value = false;
                return;
            }
            const newTracks = res.data;
            if (newTracks.length === 0 && pageNumber > 1) {
                pageState.value -= 1;
                loadingState.value = false;
                return;
            }
            tracksState.value = newTracks;
            loadingState.value = false;
        };
        pageState.onUpdate = update;
        filterState.onUpdate = update;
        element.appendChild(await TrackTemplates.trackList(tracksState, pageState, type, filterState, loadingState, user));
        pageState.value = 1;
    }
}