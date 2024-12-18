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
import {currentTrackId, currentTrackPosition} from "./js/state.ts";
import {StreamingBroadcaster} from "./js/Streaming/StreamingBroadcaster.ts";
import {TrackPosition} from "./js/Models/TrackPosition.ts";

//LydaCache.clear();
let pageContainer = document.querySelector(".page-container");
if (!pageContainer) {
    throw new Error("No page container found");
}
pageContainer.appendChild(GenericTemplates.loadingSpinner());

export const router = new Router(routes, async (route: Route, params: any) => {
    const page = route.path.replace("/", "");
    console.log(`Navigating to ${page} with params`, params);

    await Ui.windowResize();

    const user = await Util.getUserAsync();
    pageContainer.innerHTML = "";
    let template = PageTemplates.mapping[page]();
    if (!user && PageTemplates.nonUserFallback[page]) {
        template = PageTemplates.nonUserFallback[page]();
    }
    pageContainer.appendChild(template);
    pageContainer.scrollIntoView();

    Ui.loadTheme(user).then();

    const userToShow = page === Ui.validUrlPaths.profile ? params.path_1 : null;
    const userFound = await Ui.initUser(userToShow);
    if (userToShow && !userFound && page !== "404") {
        navigate("404");
        return;
    }
    await Lyda.initPage(params);
}, async (route: Route, params: any) => {
    const currentTrackPositionTmp = LydaCache.get<TrackPosition>("currentTrackPosition").content;
    if (currentTrackPositionTmp) {
        currentTrackPosition.value = currentTrackPositionTmp;
    }
    const currentTrackIdTmp = LydaCache.get<number>("currentTrackId").content;
    if (currentTrackIdTmp) {
        currentTrackId.value = currentTrackIdTmp;
        await PlayManager.initializeTrackAsync(currentTrackIdTmp);
    }
}, () => {
    setTimeout(() => {
        console.log("No route found, attempting to redirect to profile");
        const path = window.location.pathname;
        navigate("profile" + path);
    }, 100);
});

KeyBinds.initiate();
UiActions.runMobileCheck();
StreamingBroadcaster.initializeReceiver();