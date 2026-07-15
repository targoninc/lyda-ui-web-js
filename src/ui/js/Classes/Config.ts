export class Config {
    private static get isDesktopProxy() {
        return window.__desktopMode || window.location.hostname === "127.0.0.1";
    }

    static get appBaseUrl() {
        return window.location.host;
    }
    static get apiBaseUrl() {
        if (Config.isDesktopProxy) return window.__desktopApiUrl ?? window.location.origin;
        return window.location.hostname === "localhost" ? "http://localhost:8081" : "https://api.lyda.app";
    }
    static get storageBaseUrl() {
        if (Config.isDesktopProxy) return window.__desktopApiUrl ?? window.location.origin;
        return window.location.hostname === "localhost" ? "http://localhost:8081" : "https://api.lyda.app";
    }

    static get() {
        try {
            let config = {
                appBaseUrl: Config.appBaseUrl,
                apiBaseUrl: Config.apiBaseUrl,
                storageBaseUrl: Config.storageBaseUrl,
                filePath: Config.storageBaseUrl + "/storage/v2",
                avatarPath: "",
                bannerPath: "",
                coverPath: "",
                coverPathTracks: "",
                coverPathAlbums: "",
                coverPathPlaylists: "",
            } as { [key: string]: string };

            config = {
                ...config,
                avatarPath: config.filePath + "/avatars/",
                bannerPath: config.filePath + "/banners/",
                coverPath: config.filePath + "/covers/",
                coverPathTracks: config.coverPath + "tracks/",
                coverPathAlbums: config.coverPath + "albums/",
                coverPathPlaylists: config.coverPath + "playlists/",
            }

            return config;
        } catch (e) {
            console.error("Failed to create config");
        }
    }

    static getKey(key: string): string|null {
        const config = Config.get();
        return config ? config[key] : null;
    }
}
