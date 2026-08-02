import { Route } from "./Router.ts";

export enum RoutePath {
    explore = "explore",
    notFound = "404",
    profile = "profile",
    following = "following",
    roadmap = "roadmap",
    album = "album",
    playlist = "playlist",
    track = "track",
    editTrack = "edit-track",
    settings = "settings",
    statistics = "statistics",
    search = "search",
    upload = "upload",
    library = "library",
    logout = "logout",
    login = "login",
    unapprovedTracks = "unapproved-tracks",
    test = "test",
    subscribe = "subscribe",
    passwordReset = "password-reset",
    verifyEmail = "verify-email",
    faq = "faq",
    history = "history",
    batchEdit = "batch-edit",
    protocolHandler = "protocolHandler",
    transactions = "transactions",
    createAlbum = "create-album",
    createPlaylist = "create-playlist",
}

export const routes: Route[] = [
    {
        path: RoutePath.explore,
        title: "Explore",
        aliases: ["discover"]
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
        aliases: ["home", "app", "/"]
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
        path: RoutePath.editTrack,
        title: "Edit track",
        params: ["id"]
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
        path: RoutePath.unapprovedTracks,
        title: "Unapproved Tracks",
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
        path: RoutePath.faq,
        title: "FAQ",
    },
    {
        path: RoutePath.history,
        title: "History",
    },
    {
        path: RoutePath.protocolHandler,
        title: "Protocol handler",
    },
    {
        path: RoutePath.batchEdit,
        title: "Batch edit",
    },
    {
        path: RoutePath.transactions,
        title: "Transactions",
    },
    {
        path: RoutePath.createAlbum,
        title: "Create Album",
    },
    {
        path: RoutePath.createPlaylist,
        title: "Create Playlist",
    },
];
