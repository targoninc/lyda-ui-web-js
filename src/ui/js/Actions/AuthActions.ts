import {Api} from "../Classes/Api.ts";
import {Util} from "../Classes/Util.ts";
import {Ui} from "../Classes/Ui.ts";
import {LydaCache} from "../Cache/LydaCache.ts";
import {Icons} from "../Enums/Icons.js";
import {PlayManager} from "../Streaming/PlayManager.mjs";

export class AuthActions {
    static resetUiState() {
        const navtop = document.getElementById("navTop");
        if (navtop) navtop.remove();
        const footer = document.querySelector("footer");
        if (footer) footer.innerHTML = "";
        window.navInitialized = false;
        LydaCache.clear();
        PlayManager.stopAllAsync().then();
    }

    static async logOut() {
        AuthActions.resetUiState();
        const res = await Api.postAsync(Api.endpoints.user.actions.logout);
        if (res.code === 200) {
            window.router.reload();
            Ui.notify("Logged out!", "success");
        }
        return res;
    }

    static async logOutWithRedirect() {
        let r = await AuthActions.logOut();
        if (r.code === 200) {
            window.router.navigate("login");
        } else {
            Ui.notify("Failed to log out. Please try again later.", "error");
        }
    }

    static async loginLogout() {
        const user = LydaCache.get("user");
        if (user.content) {
            await Ui.getConfirmationModal("Log out", "Are you sure you want to log out?", "Yes", "No", AuthActions.logOut, () => {
            }, Icons.WARNING);
        } else {
            window.router.navigate("login");
        }
    }
}