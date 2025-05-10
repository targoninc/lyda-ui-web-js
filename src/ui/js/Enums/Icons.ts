export class Icons {
    static get BASE_URL() {
        return window.location.origin + "/img/icons/";
    }

    static get IMAGE_FORMAT() {
        return ".svg";
    }

    static validateIcon(icon: string) {
        if (icon === null || icon === undefined || icon === "") {
            return Icons.LYDA;
        }

        /*fetch(icon).then((response) => {
            if (response.status === 404) {
                console.error("Icon not found: ", icon);
            }
        });*/

        return icon;
    }

    static ICON(fileName: string): string {
        return Icons.validateIcon(Icons.BASE_URL + fileName + Icons.IMAGE_FORMAT);
    }

    static get WARNING() {
        return Icons.ICON("warning");
    }

    static get QUEUE() {
        return Icons.ICON("queue");
    }

    static get UNQUEUE() {
        return Icons.ICON("unqueue");
    }

    static get PAUSE() {
        return Icons.ICON("pause");
    }

    static get PLAY() {
        return Icons.ICON("play");
    }

    static get LOUD() {
        return Icons.ICON("loud");
    }

    static get MUTE() {
        return Icons.ICON("mute");
    }

    static get LIKE() {
        return Icons.ICON("like");
    }

    static get LIKE_OUTLINE() {
        return Icons.ICON("like_outline");
    }

    static get LYDA() {
        return Icons.ICON("lyda_black");
    }

    static get DELETE() {
        return Icons.ICON("delete");
    }

    static get BURGER() {
        return Icons.ICON("burger");
    }

    static get X() {
        return Icons.ICON("x");
    }

    static get ALBUM_ADD() {
        return Icons.ICON("album_add");
    }

    static get PLAYLIST_ADD() {
        return Icons.ICON("playlist_add");
    }

    static get LOCK() {
        return Icons.ICON("lock");
    }

    static get LOOP_SINGLE() {
        return Icons.ICON("loop_single");
    }

    static get LOOP_CONTEXT() {
        return Icons.ICON("loop_context");
    }

    static get LOOP_OFF() {
        return Icons.ICON("loop_off");
    }

    static get FOLLOW() {
        return Icons.ICON("follow");
    }

    static get UNFOLLOW() {
        return Icons.ICON("unfollow");
    }

    static get VERIFIED() {
        return Icons.ICON("verified");
    }

    static get PAYPAL() {
        return Icons.ICON("paypal");
    }

    static get PEN() {
        return Icons.ICON("pen");
    }

    static get SPINNER() {
        return Icons.ICON("spinner");
    }

    static get REPOST() {
        return Icons.ICON("repost");
    }

    static get APPROVAL() {
        return Icons.ICON("approval");
    }

    static get CHECK() {
        return Icons.ICON("check");
    }

    static get STARS() {
        return Icons.ICON("stars");
    }
}