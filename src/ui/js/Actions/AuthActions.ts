import { Ui } from "../Classes/Ui.ts";
import { LydaCache } from "../Cache/LydaCache.ts";
import { Icons } from "../Enums/Icons.ts";
import { PlayManager } from "../Streaming/PlayManager.ts";
import { navigate } from "../Routing/Router.ts";
import { currentTrackId, navInitialized } from "../state.ts";
import { RoutePath } from "../Routing/routes.ts";
import { Api } from "../Api/Api.ts";
import { t } from "../../locales";

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
        currentTrackId.value = 0;
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
            await Ui.getConfirmationModal(t("LOG_OUT"), t("SURE_LOGOUT"), t("YES"), t("NO"), AuthActions.logOut, () => {
            }, Icons.WARNING);
        } else {
            navigate(RoutePath.login);
        }
    }
}