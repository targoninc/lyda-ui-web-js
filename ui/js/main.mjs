import {Router} from "./Routing/Router.mjs";
import {PageTemplates} from "./Templates/PageTemplates.mjs";
import {KeyBinds} from "./Classes/KeyBindHandler.mjs";
import {LydaCache} from "./Cache/LydaCache.mjs";
import {PlayManager} from "./Streaming/PlayManager.mjs";
import {Lyda} from "./lyda.mjs";
import {UiActions} from "./Actions/UiActions.mjs";
import {Ui} from "./Classes/Ui.mjs";
import {Util} from "./Classes/Util.mjs";

window.router = new Router([
    {
        path: "404",
        aliases: ["error", "not-found"]
    },
    {
        path: "profile",
        params: ["name"],
        aliases: ["user"]
    },
    {
        path: "explore",
        aliases: ["discover", "home", "app"]
    },
    {
        path: "following"
    },
    {
        path: "album",
        params: ["id"]
    },
    {
        path: "playlist",
        params: ["id"]
    },
    {
        path: "track",
        params: ["id", "code"]
    },
    {
        path: "settings"
    },
    {
        path: "statistics"
    },
    {
        path: "upload"
    },
    {
        path: "library",
        params: ["name"]
    },
    {
        path: "logout"
    },
    {
        path: "login"
    },
    {
        path: "logs"
    },
    {
        path: "action-logs"
    },
    {
        path: "unapproved-tracks"
    },
    {
        path: "moderation"
    },
    {
        path: "test"
    },
    {
        path: "subscribe"
    }
], async (route, params) => {
    const page = route.path.replace("/", "");
    console.log(`Navigating to ${page} with params`, params);

    await Ui.windowResize();

    let pageContainer = document.querySelector(".page-container");
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