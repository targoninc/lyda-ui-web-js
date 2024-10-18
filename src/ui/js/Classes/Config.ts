export class Config {
    static get appBaseUrl() {
        return window.location.host;
    }
    static get apiBaseUrl() {
        return window.location.hostname === "localhost" ? "http://localhost:8081" : "https://api.lyda.app";
    }
    static get storageBaseUrl() {
        return window.location.hostname === "localhost" ? "http://localhost:8081" : "https://api.lyda.app";
    }

    static get() {
        const config = {
            appBaseUrl: Config.appBaseUrl,
            apiBaseUrl: Config.apiBaseUrl,
            storageBaseUrl: Config.storageBaseUrl,
        };

        try {
            config.filePath = config.storageBaseUrl + "/storage/v2";
            config.avatarPath = config.filePath + "/avatars/";
            config.bannerPath = config.filePath + "/banners/";
            config.coverPath = config.filePath + "/covers/";
            config.coverPathTracks = config.coverPath + "tracks/";
            config.coverPathAlbums = config.coverPath + "albums/";
            config.coverPathPlaylists = config.coverPath + "playlists/";
            return config;
        } catch (e) {
            console.error("Failed to parse config");
        }
    }

    static getKey(key) {
        return (Config.get())[key];
    }
}