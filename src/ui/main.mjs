import {Router} from "./js/Routing/Router.ts";
import {PageTemplates} from "./js/Templates/PageTemplates.mjs";
import {KeyBinds} from "./js/Classes/KeyBindHandler.ts";
import {LydaCache} from "./js/Cache/LydaCache.ts";
import {PlayManager} from "./js/Streaming/PlayManager.ts";
import {Lyda} from "./js/lyda.mjs";
import {UiActions} from "./js/Actions/UiActions.ts";
import {Ui} from "./js/Classes/Ui.ts";
import {Util} from "./js/Classes/Util.ts";
import {routes} from "./js/routes";
import {GenericTemplates} from "./js/Templates/GenericTemplates.ts";

LydaCache.clear();
let pageContainer = document.querySelector(".page-container");
pageContainer.appendChild(GenericTemplates.loadingSpinner());

window.router = new Router(routes, async (route, params) => {
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
        window.router.navigate("404");
        return;
    }
    await Lyda.initPage(params);
}, async (route, params) => {
    const page = route.path;
    Ui.updateNavBar(page);

    const currentTrackId = LydaCache.get("currentTrackId").content;
    if (currentTrackId !== null) {
        window.currentTrackId = currentTrackId;
        await PlayManager.initializeTrackAsync(currentTrackId);
    }
}, () => {
    setTimeout(() => {
        const path = window.location.pathname;
        window.router.navigate("profile" + path);
    }, 100);
});

KeyBinds.initiate();
UiActions.runMobileCheck();