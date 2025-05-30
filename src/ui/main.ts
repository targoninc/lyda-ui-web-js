import {navigate, Route, Router} from "./js/Routing/Router.ts";
import {PageTemplates} from "./js/Templates/PageTemplates.ts";
import {KeyBinds} from "./js/Classes/KeyBindHandler.ts";
import {LydaCache} from "./js/Cache/LydaCache.ts";
import {PlayManager} from "./js/Streaming/PlayManager.ts";
import {Lyda} from "./js/lyda.ts";
import {UiActions} from "./js/Actions/UiActions.ts";
import {Ui} from "./js/Classes/Ui.ts";
import {Util} from "./js/Classes/Util.ts";
import {RoutePath, routes} from "./js/Routing/routes.js";
import {GenericTemplates} from "./js/Templates/generic/GenericTemplates.ts";
import {currentTrackId, currentTrackPosition, currentUser, history, permissions, playingFrom} from "./js/state.ts";
import {StreamingBroadcaster} from "./js/Streaming/StreamingBroadcaster.ts";
import {Api} from "./js/Api/Api.ts";
import {ApiRoutes} from "./js/Api/ApiRoutes.ts";
import {PlayingFrom} from "@targoninc/lyda-shared/src/Models/PlayingFrom";
import {ListeningHistory} from "@targoninc/lyda-shared/dist/Models/db/lyda/ListeningHistory";
import {Permission} from "@targoninc/lyda-shared/src/Models/db/lyda/Permission";
import {TrackPosition} from "@targoninc/lyda-shared/src/Models/TrackPosition";

let pageContainer = document.querySelector(".page-container");
if (!pageContainer) {
    throw new Error("No page container found");
}
pageContainer.appendChild(GenericTemplates.loadingSpinner());
currentUser.value = await Util.getUserAsync(null, false);

export const router = new Router(routes, async (route: Route, params: any) => {
    const page = route.path.replace("/", "") as RoutePath;
    console.log(`Navigating to ${page} with params`, params);

    await Ui.windowResize();

    currentUser.value = await Util.getUserAsync(null, false);
    pageContainer.innerHTML = "";
    let template = PageTemplates.mapping[page](route, params);
    if (!currentUser.value && PageTemplates.needLoginPages.includes(page)) {
        navigate(RoutePath.login);
    }
    pageContainer.appendChild(template);
    pageContainer.scrollIntoView();

    Ui.loadTheme().then();
    await Lyda.initPage(params);
}, () => {}, () => {
    console.log(window.location.pathname);
    setTimeout(() => {
        console.log("No route found, attempting to redirect to profile");
        const path = window.location.pathname;
        navigate(RoutePath.profile + path);
    }, 100);
});

export function getUserPermissions() {
    Api.getAsync<Permission[]>(ApiRoutes.userPermissions).then(res => {
        if (res.code !== 200) {
            console.error("Failed to get permissions: ", res.data);
            return;
        }
        permissions.value = res.data as Permission[];
    });
}

if (currentUser.value) {
    getUserPermissions();

    const currentTrackPositionTmp = LydaCache.get<TrackPosition>("currentTrackPosition").content;
    if (currentTrackPositionTmp) {
        currentTrackPosition.value = currentTrackPositionTmp;
    }

    const currentTrackIdTmp = LydaCache.get<number>("currentTrackId").content;
    if (currentTrackIdTmp) {
        currentTrackId.value = currentTrackIdTmp;
        await PlayManager.initializeTrackAsync(currentTrackIdTmp);
        await PlayManager.stopAllAsync();
    }

    const playingFromTmp = LydaCache.get<PlayingFrom|null>("playingFrom").content;
    if (playingFromTmp) {
        playingFrom.value = playingFromTmp;
    }

    const tmpHistory = LydaCache.get<ListeningHistory[]|null>("listeningHistory").content;
    if (tmpHistory) {
        history.value = tmpHistory;
    }
}

KeyBinds.initiate();
UiActions.runMobileCheck();
StreamingBroadcaster.initializeReceiver();

//startUpdateCheck();