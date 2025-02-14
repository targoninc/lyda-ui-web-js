import {Route} from "./Router.ts";

export const routes: Route[] = [
    {
        path: "explore",
        title: "Explore",
        aliases: ["discover", "home", "app", "/"]
    },
    {
        path: "404",
        title: "404",
        aliases: ["error", "not-found"]
    },
    {
        path: "profile",
        title: "Profile",
        params: ["name"],
        aliases: ["user"]
    },
    {
        path: "following",
        title: "Following",
    },
    {
        path: "roadmap",
        title: "Roadmap",
    },
    {
        path: "album",
        title: "Album",
        params: ["id"]
    },
    {
        path: "playlist",
        title: "Playlist",
        params: ["id"]
    },
    {
        path: "track",
        title: "Track",
        params: ["id", "code"]
    },
    {
        path: "settings",
        title: "Settings",
    },
    {
        path: "statistics",
        title: "Statistics",
    },
    {
        path: "search",
        title: "Search",
        params: ["q"]
    },
    {
        path: "upload",
        title: "Upload",
    },
    {
        path: "library",
        title: "Library",
        params: ["name"]
    },
    {
        path: "logout",
        title: "Logout",
    },
    {
        path: "login",
        title: "Login",
    },
    {
        path: "logs",
        title: "Logs",
    },
    {
        path: "action-logs",
        title: "Action Logs",
    },
    {
        path: "unapproved-tracks",
        title: "Unapproved Tracks",
    },
    {
        path: "moderation",
        title: "Moderation",
    },
    {
        path: "test",
        title: "Test",
    },
    {
        path: "subscribe",
        title: "Subscribe",
    },
    {
        path: "password-reset",
        title: "Password Reset",
    },
    {
        path: "verify-email",
        title: "Verify Email",
    }
];