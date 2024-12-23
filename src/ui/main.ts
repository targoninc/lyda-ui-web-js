import {navigate, Route, Router} from "./js/Routing/Router.ts";
import {PageTemplates} from "./js/Templates/PageTemplates.ts";
import {KeyBinds} from "./js/Classes/KeyBindHandler.ts";
import {LydaCache} from "./js/Cache/LydaCache.ts";
import {PlayManager} from "./js/Streaming/PlayManager.ts";
import {Lyda} from "./js/lyda.ts";
import {UiActions} from "./js/Actions/UiActions.ts";
import {Ui} from "./js/Classes/Ui.ts";
import {Util} from "./js/Classes/Util.ts";
import {routes} from "./js/Routing/routes.js";
import {GenericTemplates} from "./js/Templates/GenericTemplates.ts";
import {currentTrackId, currentTrackPosition, currentUser} from "./js/state.ts";
import {StreamingBroadcaster} from "./js/Streaming/StreamingBroadcaster.ts";
import {TrackPosition} from "./js/Models/TrackPosition.ts";

//LydaCache.clear();
let pageContainer = document.querySelector(".page-container");
if (!pageContainer) {
    throw new Error("No page container found");
}
pageContainer.appendChild(GenericTemplates.loadingSpinner());
currentUser.value = await Util.getUserAsync(null, false);

export const router = new Router(routes, async (route: Route, params: any) => {
    const page = route.path.replace("/", "");
    console.log(`Navigating to ${page} with params`, params);

    await Ui.windowResize();

    currentUser.value = await Util.getUserAsync(null, false);
    pageContainer.innerHTML = "";
    let template = PageTemplates.mapping[page]();
    if (!currentUser.value && PageTemplates.needLoginPages.includes(page)) {
        navigate("login");
    }
    pageContainer.appendChild(template);
    pageContainer.scrollIntoView();

    Ui.loadTheme().then();
    await Lyda.initPage(params);
}, () => {}, () => {
    setTimeout(() => {
        console.log("No route found, attempting to redirect to profile");
        const path = window.location.pathname;
        navigate("profile" + path);
    }, 100);
});

if (currentUser.value) {
    const currentTrackPositionTmp = LydaCache.get<TrackPosition>("currentTrackPosition").content;
    if (currentTrackPositionTmp) {
        currentTrackPosition.value = currentTrackPositionTmp;
    }

    const currentTrackIdTmp = LydaCache.get<number>("currentTrackId").content;
    if (currentTrackIdTmp) {
        currentTrackId.value = currentTrackIdTmp;
        await PlayManager.initializeTrackAsync(currentTrackIdTmp);
    }
}

KeyBinds.initiate();
UiActions.runMobileCheck();
StreamingBroadcaster.initializeReceiver();