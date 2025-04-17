import {Route} from "./Router.ts";

export enum RoutePath {
    explore = "explore",
    notFound = "404",
    profile = "profile",
    following = "following",
    roadmap = "roadmap",
    album = "album",
    playlist = "playlist",
    track = "track",
    settings = "settings",
    statistics = "statistics",
    search = "search",
    upload = "upload",
    library = "library",
    logout = "logout",
    login = "login",
    logs = "logs",
    actionLogs = "action-logs",
    unapprovedTracks = "unapproved-tracks",
    moderation = "moderation",
    test = "test",
    subscribe = "subscribe",
    passwordReset = "password-reset",
    verifyEmail = "verify-email",
    events = "events",
    admin = "admin",
    faq = "faq",
}

export const routes: Route[] = [
    {
        path: RoutePath.explore,
        title: "Explore",
        aliases: ["discover", "home", "app", "/"]
    },
    {
        path: RoutePath.notFound,
        title: "404",
        aliases: ["error", "not-found"]
    },
    {
        path: RoutePath.profile,
        title: "Profile",
        params: ["name"],
        aliases: ["user"]
    },
    {
        path: RoutePath.following,
        title: "Following",
    },
    {
        path: RoutePath.roadmap,
        title: "Roadmap",
    },
    {
        path: RoutePath.album,
        title: "Album",
        params: ["id"]
    },
    {
        path: RoutePath.playlist,
        title: "Playlist",
        params: ["id"]
    },
    {
        path: RoutePath.track,
        title: "Track",
        params: ["id", "code"]
    },
    {
        path: RoutePath.settings,
        title: "Settings",
    },
    {
        path: RoutePath.statistics,
        title: "Statistics",
    },
    {
        path: RoutePath.search,
        title: "Search",
        params: ["q"]
    },
    {
        path: RoutePath.upload,
        title: "Upload",
    },
    {
        path: RoutePath.library,
        title: "Library",
        params: ["name"]
    },
    {
        path: RoutePath.logout,
        title: "Logout",
    },
    {
        path: RoutePath.login,
        title: "Login",
    },
    {
        path: RoutePath.logs,
        title: "Logs",
    },
    {
        path: RoutePath.actionLogs,
        title: "Action Logs",
    },
    {
        path: RoutePath.unapprovedTracks,
        title: "Unapproved Tracks",
    },
    {
        path: RoutePath.moderation,
        title: "Moderation",
    },
    {
        path: RoutePath.test,
        title: "Test",
    },
    {
        path: RoutePath.subscribe,
        title: "Subscribe",
    },
    {
        path: RoutePath.passwordReset,
        title: "Password Reset",
    },
    {
        path: RoutePath.verifyEmail,
        title: "Verify Email",
    },
    {
        path: RoutePath.events,
        title: "Events",
    },
    {
        path: RoutePath.admin,
        title: "Admin",
    },
    {
        path: RoutePath.faq,
        title: "FAQ",
    }
];