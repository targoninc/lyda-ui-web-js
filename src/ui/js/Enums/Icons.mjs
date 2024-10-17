export class Icons {
    static get BASE_URL() {
        return window.location.origin + "/img/icons/";
    }

    static get IMAGE_FORMAT() {
        return ".svg";
    }

    static validateIcon(icon) {
        if (icon === null || icon === undefined || icon === "") {
            return Icons.LYDA;
        }

        fetch(icon).then((response) => {
            if (response.status === 404) {
                console.error("Icon not found: ", icon);
            }
        });

        return icon;
    }

    static ICON(fileName) {
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

    static get COMMENT() {
        return Icons.ICON("comment");
    }

    static get LYDA() {
        return Icons.ICON("lyda_black");
    }

    static get DELETE() {
        return Icons.ICON("delete");
    }

    static get BELL() {
        return Icons.ICON("bell");
    }

    static get LAMP_ON() {
        return Icons.ICON("lamp_on");
    }

    static get LAMP_OFF() {
        return Icons.ICON("lamp_off");
    }

    static get BURGER() {
        return Icons.ICON("burger");
    }

    static get X() {
        return Icons.ICON("x");
    }

    static get REPLY() {
        return Icons.ICON("reply");
    }

    static get ALBUM_ADD() {
        return Icons.ICON("album_add");
    }

    static get PLAYLIST_ADD() {
        return Icons.ICON("playlist_add");
    }

    static get ARROW_UP() {
        return Icons.ICON("arrow_up");
    }

    static get ARROW_DOWN() {
        return Icons.ICON("arrow_down");
    }

    static get ARROW_LEFT() {
        return Icons.ICON("arrow_left");
    }

    static get ARROW_RIGHT() {
        return Icons.ICON("arrow_right");
    }

    static get UPLOAD() {
        return Icons.ICON("upload");
    }

    static get SETTINGS() {
        return Icons.ICON("settings");
    }

    static get STATISTICS() {
        return Icons.ICON("statistics");
    }

    static get UP() {
        return Icons.ICON("up");
    }

    static get DOWN() {
        return Icons.ICON("down");
    }

    static get LEFT() {
        return Icons.ICON("left");
    }

    static get RIGHT() {
        return Icons.ICON("right");
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

    static get LOGOUT() {
        return Icons.ICON("logout");
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

    static get LOGIN() {
        return Icons.ICON("login");
    }

    static get RELOAD() {
        return Icons.ICON("reload");
    }

    static get ACCOUNTS() {
        return Icons.ICON("accounts");
    }

    static get SUBSCRIPTIONS() {
        return Icons.ICON("subscriptions");
    }

    static get CALCULATE() {
        return Icons.ICON("calculate");
    }

    static get PAY() {
        return Icons.ICON("pay");
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

    static get PEOPLE() {
        return Icons.ICON("people");
    }

    static get STARS() {
        return Icons.ICON("stars");
    }

    static get COPY() {
        return Icons.ICON("copy");
    }

    static get DROPDOWN() {
        return Icons.ICON("dropdown");
    }

    static get GIFT() {
        return Icons.ICON("gift");
    }
}