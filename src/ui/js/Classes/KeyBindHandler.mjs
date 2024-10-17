import {PlayManager} from "../Streaming/PlayManager.mjs";
import {UiActions} from "../Actions/UiActions.mjs";
import {AuthActions} from "../Actions/AuthActions.mjs";

export class KeyBinds {
    static bindings = {
        TogglePlay: ["Space"],
        SkipForward: ["ArrowRight", "KeyD"],
        SkipBackward: ["ArrowLeft", "KeyA"],
        VolumeUp: ["ArrowUp"],
        VolumeDown: ["ArrowDown"],
        NewMenu: ["KeyN"],
        Close: ["Escape"],
        LoginLogout: ["KeyL"],
    };

    static functionMap = {
        TogglePlay: { function: PlayManager.togglePlayAsync },
        SkipForward: { function: PlayManager.skipForward, neededModifiers: ["shift"] },
        SkipBackward: { function: PlayManager.skipBackward, neededModifiers: ["shift"] },
        VolumeUp: { function: PlayManager.volumeUp, neededModifiers: ["shift"] },
        VolumeDown: { function: PlayManager.volumeDown, neededModifiers: ["shift"] },
        NewMenu: { function: UiActions.openCreateMenu, neededModifiers: ["shift"] },
        LoginLogout: {function: AuthActions.loginLogout, neededModifiers: ["shift"]},
        Close: { function: UiActions.closeModal },
    };

    static handler(e) {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
            return;
        }
        for (const action in KeyBinds.bindings) {
            const keybinds = KeyBinds.bindings[action];
            for (const key of keybinds) {
                if (e.code === key) {
                    const funcItem = KeyBinds.functionMap[action];
                    if (funcItem.neededModifiers) {
                        for (const modifier of funcItem.neededModifiers) {
                            if (!e[modifier+"Key"]) {
                                return;
                            }
                        }
                    }
                    e.preventDefault();
                    funcItem.function(window.currentTrackId);
                }
            }
        }
    }

    static initiate() {
        if (window.keybindsInitialized) {
            return;
        }
        document.addEventListener("keydown", KeyBinds.handler);
        window.keybindsInitialized = true;
    }
}