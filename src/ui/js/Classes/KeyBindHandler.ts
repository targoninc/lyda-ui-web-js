import {PlayManager} from "../Streaming/PlayManager.ts";
import {UiActions} from "../Actions/UiActions.ts";
import {AuthActions} from "../Actions/AuthActions.ts";
import {currentTrackId} from "../state.ts";
import {signal} from "../../fjsc/src/signals.ts";
import {target} from "./Util.ts";

const keybindsInitialized = signal(false);

export class KeyBinds {
    static bindings: {[key: string]: string[]} = {
        TogglePlay: ["Space"],
        SkipForward: ["ArrowRight", "KeyD"],
        SkipBackward: ["ArrowLeft", "KeyA"],
        VolumeUp: ["ArrowUp"],
        VolumeDown: ["ArrowDown"],
        NewMenu: ["KeyN"],
        Close: ["Escape"],
        LoginLogout: ["KeyL"],
    };

    static functionMap: {[key: string]: {function: Function, neededModifiers?: string[]}} = {
        TogglePlay: { function: PlayManager.togglePlayAsync },
        SkipForward: { function: PlayManager.skipForward, neededModifiers: ["shift"] },
        SkipBackward: { function: PlayManager.skipBackward, neededModifiers: ["shift"] },
        VolumeUp: { function: PlayManager.volumeUp, neededModifiers: ["shift"] },
        VolumeDown: { function: PlayManager.volumeDown, neededModifiers: ["shift"] },
        NewMenu: { function: UiActions.openCreateMenu, neededModifiers: ["shift"] },
        LoginLogout: {function: AuthActions.loginLogout, neededModifiers: ["shift"]},
        Close: { function: UiActions.closeModal },
    };

    static handler(e: KeyboardEvent) {
        const ignoredTargets = ["input", "textarea", "select", "button"];
        if (ignoredTargets.includes(target(e).tagName.toLowerCase())) {
            return;
        }
        for (const action in KeyBinds.bindings) {
            const keybinds = KeyBinds.bindings[action];
            for (const key of keybinds) {
                if (e.code === key) {
                    const funcItem = KeyBinds.functionMap[action];
                    if (funcItem.neededModifiers) {
                        for (const modifier of funcItem.neededModifiers) {
                            // @ts-ignore
                            if (!e[modifier+"Key"]) {
                                return;
                            }
                        }
                    }
                    e.preventDefault();
                    funcItem.function(currentTrackId.value);
                }
            }
        }
    }

    static initiate() {
        if (keybindsInitialized.value) {
            return;
        }
        document.addEventListener("keydown", KeyBinds.handler);
        keybindsInitialized.value = true;
    }
}