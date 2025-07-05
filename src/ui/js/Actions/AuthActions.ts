import { Ui} from "../Classes/Ui.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {Icons} from "../Enums/Icons.ts";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {navigate} from "../Routing/Router.ts";
import {navInitialized} from "../state.ts";
import {RoutePath} from "../Routing/routes.ts";
import { Api } from "../Api/Api.ts";

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
        await Api.logout();
    }

    static async logOutWithRedirect() {
        await AuthActions.logOut();
        window.location.reload();
        navigate(RoutePath.login);
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