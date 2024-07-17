export class Config {
    static appBaseUrl = "https://lyda.app";
    static loginBaseUrl = "https://accounts.targoninc.com";
    static apiBaseUrl = "https://api.lyda.app";
    static storageBaseUrl = "https://api.lyda.app";

    static get() {
        const config = {
            appBaseUrl: Config.appBaseUrl,
            loginBaseUrl: Config.loginBaseUrl,
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