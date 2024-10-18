import {create, signal} from "https://fjs.targoninc.com/f.js";
import {AlbumActions} from "../Actions/AlbumActions.ts";
import {PlaylistActions} from "../Actions/PlaylistActions.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {Util} from "../Classes/Util.mjs";

export class MenuTemplates {
    static genericMenu(title, menuItems) {
        const indexState = signal(0);
        const menuItemCount = menuItems.length;
        let modal = signal(MenuTemplates.getGenericModalWithSelectedIndex(indexState.value, title, menuItems));
        indexState.onUpdate = newIndex => {
            modal.value = MenuTemplates.getGenericModalWithSelectedIndex(newIndex, title, menuItems);
        };
        const eventListener = e => {
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

    static getGenericModalWithSelectedIndex(index, title, menuItems) {
        return create("div")
            .classes("flex-v")
            .children(
                GenericTemplates.title(title),
                ...menuItems.map((menuItem, itemIndex) => MenuTemplates.menuItem(menuItem.text, menuItem.action, itemIndex === index))
            ).build();
    }

    static menuItem(text, action, isSelected) {
        return create("div")
            .classes("fakeButton", "clickable", "rounded", "padded-inline", isSelected ? "active" : "_")
            .text(text)
            .onclick(action)
            .build();
    }

    static createMenu() {
        const title = "Create something new";
        let modal;
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
                    await window.router.navigate("upload");
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