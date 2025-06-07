import {HttpClient} from "../Api/HttpClient.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {Icons} from "../Enums/Icons.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {navigate} from "../Routing/Router.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {navInitialized} from "../state.ts";
import {RoutePath} from "../Routing/routes.ts";
import {NotificationType} from "../Enums/NotificationType.ts";

export class AuthActions {
    static resetUiState() {
        const navtop = document.getElementById("navTop");
        if (navtop) {
            navtop.remove();
        }
        const footer = document.querySelector("footer");
        if (footer) {
            footer.innerHTML = "";
        }
        navInitialized.value = false;
        LydaCache.clear();
        PlayManager.stopAllAsync().then();
    }

    static async logOut() {
        AuthActions.resetUiState();
        const res = await HttpClient.postAsync(ApiRoutes.logout);
        if (res.code === 200) {
            notify("Logged out!", NotificationType.success);
            navigate(RoutePath.login);
        }
        return res;
    }

    static async logOutWithRedirect() {
        let r = await AuthActions.logOut();
        if (r.code === 200) {
            window.location.reload();
            navigate(RoutePath.login);
        } else {
            notify("Failed to log out. Please try again later.", NotificationType.error);
        }
    }

    static async loginLogout() {
        const user = LydaCache.get("user");
        if (user.content) {
            await Ui.getConfirmationModal("Log out", "Are you sure you want to log out?", "Yes", "No", AuthActions.logOut, () => {
            }, Icons.WARNING);
        } else {
            navigate(RoutePath.login);
        }
    }
}