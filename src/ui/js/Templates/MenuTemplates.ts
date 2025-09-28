import { AlbumActions } from "../Actions/AlbumActions.ts";
import { PlaylistActions } from "../Actions/PlaylistActions.ts";
import { GenericTemplates, horizontal } from "./generic/GenericTemplates.ts";
import { Util } from "../Classes/Util.ts";
import { navigate } from "../Routing/Router.ts";
import { AnyElement, compute, create, HtmlPropertyValue, signal, Signal, StringOrSignal } from "@targoninc/jess";
import { RoutePath } from "../Routing/routes.ts";
import { button } from "@targoninc/jess-components";
import { t } from "../../locales";

export class MenuTemplates {
    static genericMenu(title: HtmlPropertyValue, menuItems: any[], onClose: () => void) {
        const indexState = signal(0);
        const menuItemCount = menuItems.length;

        const modal = MenuTemplates.getGenericModalWithSelectedIndex(indexState, title, menuItems, onClose);

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
        return {
            modal,
            eventListener,
        };
    }

    static getGenericModalWithSelectedIndex(selectedIndex: Signal<number>, title: HtmlPropertyValue, menuItems: any[], onClose: () => void) {
        return create("div")
            .classes("flex-v")
            .children(
                horizontal(
                    GenericTemplates.title(title),
                    button({
                        text: t("CLOSE"),
                        icon: { icon: "close" },
                        onclick: onClose,
                    }),
                ),
                ...menuItems.map((menuItem, itemIndex) => MenuTemplates.menuItem(menuItem.text, menuItem.action, menuItem.icon, selectedIndex, itemIndex))
            ).build();
    }

    static menuItem(text: HtmlPropertyValue, action: Function, icon: string, selectedIndex: Signal<number>, index: number) {
        const isSelected = compute(i => i === index, selectedIndex);
        const selectedClass = compute((is): string => is ? "active" : "_", isSelected);

        return button({
            text: text as StringOrSignal,
            icon: { icon },
            onclick: action,
            classes: [selectedClass],
        });
    }

    static createMenu() {
        let modal: AnyElement;
        let listener: (this: Document, ev: KeyboardEvent) => void = () => {};
        const cleanup = () => {
            document.removeEventListener("keydown", listener);
            Util.removeModal(modal);
        };

        const items = [
            {
                text: t("NEW_ALBUM"),
                icon: "forms_add_on",
                action: async () => {
                    cleanup();
                    await AlbumActions.openNewAlbumModal();
                }
            },
            {
                text: t("NEW_TRACK"),
                icon: "upload",
                action: async () => {
                    cleanup();
                    navigate(RoutePath.upload);
                }
            },
            {
                text: t("NEW_PLAYLIST"),
                icon: "playlist_add",
                action: async () => {
                    cleanup();
                    await PlaylistActions.openNewPlaylistModal();
                }
            }
        ];
        const out = MenuTemplates.genericMenu(t("CREATE_SOMETHING_NEW"), items, cleanup);
        modal = out.modal;
        listener = out.eventListener;
        return modal;
    }
}