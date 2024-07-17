import {Ui} from "./Ui.mjs";

export class UrlHandler {
    /**
     * @param page
     * @param notification {null|message: string, type: string}
     */
    static redirectIfDifferent(page, notification = null) {
        if (window.router.currentRoute.path === page) {
            return;
        }
        window.router.navigate(page);
        if (notification !== null) {
            Ui.notify(notification.message, notification.type);
        }
    }
}