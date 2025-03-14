import {PlayManager} from "./Streaming/PlayManager.ts";
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
import {LogTemplates} from "./Templates/admin/LogTemplates.ts";
import {Permissions} from "./Enums/Permissions.ts";
import {LydaApi} from "./Api/LydaApi.ts";
import {TrackActions} from "./Actions/TrackActions.ts";
import {CommentActions} from "./Actions/CommentActions.ts";
import {CommentTemplates} from "./Templates/CommentTemplates.ts";
import {SubscriptionTemplates} from "./Templates/SubscriptionTemplates.ts";
import {SubscriptionActions} from "./Actions/SubscriptionActions.ts";
import {Util} from "./Classes/Util.ts";
import {StatisticsWrapper} from "./Classes/StatisticsWrapper.ts";
import {notify} from "./Classes/Ui.ts";
import {navigate} from "./Routing/Router.ts";
import {Permission} from "./Models/DbModels/lyda/Permission.ts";
import {Follow} from "./Models/DbModels/lyda/Follow.ts";
import {AnyElement, create, ifjs} from "../fjsc/src/f2.ts";
import {User} from "./Models/DbModels/lyda/User.ts";
import {ApiRoutes} from "./Api/ApiRoutes.ts";
import {signal} from "../fjsc/src/signals.ts";
import {Track} from "./Models/DbModels/lyda/Track.ts";
import {LogLevel} from "./Enums/LogLevel.ts";
import {Log} from "./Models/DbModels/lyda/Log.ts";
import {NotificationType} from "./Enums/NotificationType.ts";
import {AvailableSubscription} from "./Models/DbModels/finance/AvailableSubscription.ts";
import {Subscription} from "./Models/DbModels/finance/Subscription.ts";
import {currentSecretCode, currentUser, permissions} from "./state.ts";
import {RoyaltyInfo} from "./Models/RoyaltyInfo.ts";
import {RoyaltyTemplates} from "./Templates/admin/RoyaltyTemplates.ts";

export class Lyda {
    static async getEndpointData(endpoint: string, params = "") {
        let r = await Api.getAsync<any>(endpoint + params);
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
        const user = currentUser.value;

        switch (element.getAttribute("datatype")) {
            case "uploadForm":
                // @ts-ignore
                element.appendChild(TrackEditTemplates.uploadForm());
                break;
            case "tracks":
                const feedType = element.getAttribute("feedType");
                if (!user && feedType !== "explore") {
                    notify("You need to be logged in to see your feed", NotificationType.error);
                    return;
                }
                if (!feedType) {
                    throw new Error("Missing feed type");
                }
                this.loadFeed(feedType, element).then();
                if (data && data.error) {
                    element.innerHTML = data.error;
                    return;
                }
                break;
            case "profile":
                if (!data || data.error) {
                    navigate("404");
                    return;
                }
                document.title = data.displayname;
                const isOwnProfile = user ? data.id === user.id : false;
                if (!user && isOwnProfile) {
                    notify("You need to be logged in to see your profile", NotificationType.error);
                    return;
                }
                element.append(...UserTemplates.profile(isOwnProfile, data, permissions.value));
                ProfilePage.addTabSectionAsync(element, data, isOwnProfile).then();
                break;
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
            case "album":
                if (!user) {
                    navigate("explore");
                    return;
                }
                document.title = data.album.title;
                element.appendChild(await AlbumTemplates.albumPage(data, user));
                if (data.error) {
                    element.innerHTML = data.error;
                    return;
                }
                break;
            case "playlist":
                if (!user) {
                    navigate("explore");
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
                    navigate("explore");
                    return;
                }
                const royaltyInfo = await Api.getAsync<RoyaltyInfo>(ApiRoutes.getRoyaltyInfo);
                element.append(StatisticTemplates.artistRoyaltyActions(royaltyInfo.data));
                element.append(RoyaltyTemplates.royaltyOverview(royaltyInfo.data));
                element.append(create("div").classes("flex").children(...(await StatisticsWrapper.getStatistics(permissions.value))).build());
                break;
            case "library":
                if (!user) {
                    notify("You need to be logged in to view your library", NotificationType.error);
                    navigate("login");
                    return;
                }
                const name = params.name ?? "";
                document.title = "Library - " + name;
                const library = await LibraryActions.getLibrary(name);
                if (!library) {
                    element.appendChild(UserTemplates.notPublicLibrary(name));
                    return;
                }
                const page = UserTemplates.libraryPage(library.albums, library.playlists, library.tracks, user);
                element.appendChild(page);
                break;
            case "logs":
                if (!permissions.value.some((p: Permission) => p.name === Permissions.canViewLogs)) {
                    notify("You do not have permission to view logs", NotificationType.error);
                    navigate("profile");
                    return;
                }
                element.appendChild(LogTemplates.logsPage());
                break;
            case "actionLogs":
                if (!user) {
                    notify("You need to be logged in to see action logs", NotificationType.error);
                    return;
                }
                if (!permissions.value.some(p => p.name === Permissions.canViewActionLogs)) {
                    notify("You do not have permission to view action logs", NotificationType.error);
                    return;
                }
                const actionLogs = await Api.getAsync<any[]>(ApiRoutes.getActionLogs);
                element.appendChild(await LogTemplates.actionLogs(user, actionLogs.data));
                break;
            case "unapprovedTracks":
                if (!user) {
                    notify("You need to be logged in to see unapproved tracks", NotificationType.error);
                    navigate("login");
                    return;
                }
                TrackActions.getUnapprovedTracks().then(tracks => {
                    element.appendChild(TrackTemplates.unapprovedTracks(tracks, user));
                });
                break;
            case "moderation":
                if (!user) {
                    notify("You need to be logged in to moderate", NotificationType.error);
                    navigate("login");
                    return;
                }
                if (!permissions.value.some(p => p.name === Permissions.canDeleteComments)) {
                    notify("You do not have permission to moderate", NotificationType.error);
                    return;
                }
                element.appendChild(await CommentTemplates.moderatableCommentsPage());
                break;
            case "subscribe":
                if (!user) {
                    notify("You can only subscribe if you have an account already", NotificationType.warning);
                    navigate("login");
                    return;
                }
                const options = signal<AvailableSubscription[]>([]);
                const currentSubscription = signal<Subscription|null>(null);
                SubscriptionActions.loadSubscriptionOptions().then(res => {
                    if (!res || res.error) {
                        notify("Failed to load subscription options", NotificationType.error);
                        return;
                    }
                    options.value = res.options;
                    currentSubscription.value = res.currentSubscription;
                });
                const currency = "USD";
                element.appendChild(SubscriptionTemplates.page(currency, options, currentSubscription));
                break;
            default:
                element.innerHTML = JSON.stringify(data, null, 2);
                break;
        }
    }

    static async loadFeed(type: string, element: AnyElement) {
        const feedMap = {
            following: ApiRoutes.followingFeed,
            explore: ApiRoutes.exploreFeed,
            autoQueue: ApiRoutes.autoQueueFeed,
        };
        const endpoint = feedMap[type as keyof typeof feedMap];
        const pageState = signal(1);
        const tracksState = signal<Track[]>([]);
        const filterState = signal("all");
        const loadingState = signal(false);
        const pageSize = 10;
        const update = async () => {
            const pageNumber = pageState.value;
            const filter = filterState.value;
            const offset = (pageNumber - 1) * pageSize;
            const params = type === "following" ? {offset, filter} : {offset};
            loadingState.value = true;
            const res = await Api.getAsync<Track[]>(endpoint, params);
            if (res.code !== 200) {
                notify(`Failed to get tracks: ${res.data.error}`, NotificationType.error);
                loadingState.value = false;
                return;
            }
            const newTracks = res.data as Track[];
            if (newTracks && newTracks.length === 0 && pageNumber > 1) {
                pageState.value -= 1;
                loadingState.value = false;
                return;
            }
            tracksState.value = newTracks;
            loadingState.value = false;
        };
        pageState.onUpdate = update;
        filterState.onUpdate = update;
        element.appendChild(await TrackTemplates.trackList(tracksState, pageState, type, filterState, loadingState));
        pageState.value = 1;
    }
}