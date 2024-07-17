import {FjsObservable} from "https://fjs.targoninc.com/f.js";
import {Config} from "../Classes/Config.mjs";
import {Api} from "../Classes/Api.mjs";
import {Util} from "../Classes/Util.mjs";
import {Ui} from "../Classes/Ui.mjs";
import {LydaCache} from "../Cache/LydaCache.mjs";
import {CacheItem} from "../Cache/CacheItem.mjs";
import {Icons} from "../Enums/Icons.mjs";
import {PlayManager} from "../Streaming/PlayManager.mjs";

export class AuthActions {
    static open(e = null) {
        const state = new FjsObservable({
            loginWindow: null
        });
        if (e) {
            e.preventDefault();
            const target = e.target;
            target.querySelector("span").innerText = "Continue on the opened window...";
        }
        const config = Config.get();
        let url = config["loginBaseUrl"] + "/login?origin=" + window.location.origin + "&logo=" + window.location.origin + "/img/icons/favicon_128.png&service=Lyda";
        const width = 440, height = 550;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        state.value = {
            ...state,
            loginWindow: window.open(url, "targonLogin", `popup=1,scrollbars=1,width=${width},height=${height},top=${top},left=${left}`)
        };

        window.addEventListener("message", async (event) => {
            let message = event.data;
            if (event.origin !== config["loginBaseUrl"]) {
                return;
            }
            await AuthActions.handleMessage(state, message.type, message.data);
        });
    }

    static sendMessage(refWindow, targetUrl, payload) {
        refWindow.postMessage(
            payload,
            targetUrl
        );
        refWindow.focus();
    }

    static async handleMessage(state, type, data) {
        const config = Config.get();
        switch (type) {
        case "ready":
            let phpSessId = document.cookie.match(/PHPSESSID=[^;]+/).toString();
            phpSessId = phpSessId.replace("PHPSESSID=", "");
            AuthActions.sendMessage(state.value.loginWindow, config["loginBaseUrl"], {
                type: "loginInfo",
                data: {
                    url: Api.endpoints.auth.actions.targonLogin,
                    origin: window.location.origin,
                    username: "",
                    password: "",
                    scope: "lyda",
                    PHP_SESSID: phpSessId
                }
            });
            break;
        case "loginSuccess":
            Util.setCookie("token", data.token, 1);
            const res = await Api.getAsync(Api.endpoints.user.profile, {}, Util.getAuthorizationHeaders());
            if (res.code !== 200) {
                Ui.notify("Failed to log in. Please try again later.", "error");
                return;
            }
            const user = res.data;
            LydaCache.set("user", new CacheItem(JSON.stringify(user)));
            LydaCache.set("sessionid", new CacheItem(Util.getSessionId()));
            Ui.notify("Logged in successfully.", "success");

            let referrer = document.referrer;
            localStorage.clear();
            if (referrer !== "" && !referrer.includes("login")) {
                window.location.href = referrer;
            } else {
                window.location.href = "/home";
            }
            break;
        case "loginError":
            Ui.notify("Login failed.", "error");
            console.error("Error logging in.");
            break;
        case "registrationSuccessful":
            Ui.notify(data.message, "success");
            break;
        default: // ignore
        }
    }

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
        const res = await Api.postAsync(Api.endpoints.auth.actions.logout, {}, Util.getAuthorizationHeaders());
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