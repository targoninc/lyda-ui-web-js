import {Api} from "../Api/Api.ts";
import {notify, Ui} from "../Classes/Ui.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {Icons} from "../Enums/Icons.js";
import {PlayManager} from "../Streaming/PlayManager.ts";
import {navigate, reload} from "../Routing/Router.ts";
import {ApiRoutes} from "../Api/ApiRoutes.ts";
import {currentUser, navInitialized} from "../state.ts";

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
        const res = await Api.postAsync(ApiRoutes.logout);
        if (res.code === 200) {
            currentUser.value = null;
            reload();
            notify("Logged out!", "success");
        }
        return res;
    }

    static async logOutWithRedirect() {
        let r = await AuthActions.logOut();
        if (r.code === 200) {
            navigate("login");
        } else {
            notify("Failed to log out. Please try again later.", "error");
        }
    }

    static async loginLogout() {
        const user = LydaCache.get("user");
        if (user.content) {
            await Ui.getConfirmationModal("Log out", "Are you sure you want to log out?", "Yes", "No", AuthActions.logOut, () => {
            }, Icons.WARNING);
        } else {
            navigate("login");
        }
    }
}