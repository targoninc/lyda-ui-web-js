export class Images {
    static get FORMAT() {
        return ".webp";
    }

    static get DEFAULT_AVATAR() {
        return window.location.origin + "/img/defaults/avatar" + Images.FORMAT;
    }

    static get DEFAULT_BANNER() {
        return window.location.origin + "/img/defaults/banner" + Images.FORMAT;
    }

    static get DEFAULT_COVER_TRACK() {
        return window.location.origin + "/img/defaults/track" + Images.FORMAT;
    }

    static get DEFAULT_COVER_ALBUM() {
        return window.location.origin + "/img/defaults/album" + Images.FORMAT;
    }

    static get DEFAULT_COVER_PLAYLIST() {
        return window.location.origin + "/img/defaults/playlist" + Images.FORMAT;
    }
}