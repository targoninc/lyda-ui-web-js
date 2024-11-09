export const routes = [
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
    },
    {
        path: "password-reset"
    },
    {
        path: "activate-account"
    }
];