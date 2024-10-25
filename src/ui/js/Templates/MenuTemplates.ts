import {AlbumActions} from "../Actions/AlbumActions.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {Util} from "../Classes/Util.ts";
import {navigate} from "../Routing/Router.ts";
import {AnyElement, computedSignal, create, HtmlPropertyValue, Signal, signal, StringOrSignal} from "../../fjsc/f2.ts";
import {FJSC} from "../../fjsc";

export class MenuTemplates {
    static genericMenu(title: HtmlPropertyValue, menuItems: any[]) {
        const indexState = signal(0);
        const menuItemCount = menuItems.length;
        let modal = MenuTemplates.getGenericModalWithSelectedIndex(indexState, title, menuItems);
        const eventListener = (e: KeyboardEvent) => {
            if (e.code === "ArrowUp") {
                e.preventDefault();
                if (indexState.value === 0) {
                    indexState.value = menuItemCount - 1;
                } else {
                    indexState.value = indexState.value - 1;
                }
            } else if (e.code === "ArrowDown") {
                e.preventDefault();
                if (indexState.value === menuItemCount - 1) {
                    indexState.value = 0;
                } else {
                    indexState.value = indexState.value + 1;
                }
            } else if (e.code === "Enter") {
                e.preventDefault();
                menuItems[indexState.value].action();
            }
        };
        document.addEventListener("keydown", eventListener);
        return modal;
    }

    static getGenericModalWithSelectedIndex(selectedIndex: Signal<number>, title: HtmlPropertyValue, menuItems: any[]) {
        return create("div")
            .classes("flex-v")
            .children(
                GenericTemplates.title(title),
                ...menuItems.map((menuItem, itemIndex) => MenuTemplates.menuItem(menuItem.text, menuItem.action, selectedIndex, itemIndex))
            ).build();
    }

    static menuItem(text: HtmlPropertyValue, action: Function, selectedIndex: Signal<number>, index: number) {
        const isSelected = computedSignal(selectedIndex, (i: number) => i === index);
        const selectedClass = computedSignal<string>(isSelected, (is: boolean) => is ? "active" : "_");

        return FJSC.button({
            text: text as StringOrSignal,
            onclick: action,
            classes: ["fakeButton", "clickable", "rounded", "padded-inline", selectedClass],
        });
    }

    static createMenu() {
        const title = "Create something new";
        let modal: AnyElement;
        const items = [
            {
                text: "New Album",
                action: async () => {
                    Util.removeModal(modal);
                    await AlbumActions.openNewAlbumModal();
                }
            },
            {
                text: "New Track",
                action: async () => {
                    Util.removeModal(modal);
                    navigate("upload");
                }
            },
            {
                text: "New Playlist",
                action: async () => {
                    Util.removeModal(modal);
                    await PlaylistActions.openNewPlaylistModal();
                }
            }
        ];
        modal = MenuTemplates.genericMenu(title, items);
        return modal;
    }
}