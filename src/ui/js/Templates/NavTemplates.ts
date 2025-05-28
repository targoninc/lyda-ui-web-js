import {Icons} from "../Enums/Icons.ts";
import {UserTemplates} from "./account/UserTemplates.ts";
import {UserActions} from "../Actions/UserActions.ts";
import {GenericTemplates} from "./generic/GenericTemplates.ts";
import {SearchTemplates} from "./SearchTemplates.ts";
import {navigate, reload} from "../Routing/Router.ts";
import {create, when, StringOrSignal, compute, Signal, signal} from "@targoninc/jess";
import {router} from "../../main.ts";
import {currentUser} from "../state.ts";
import {RoutePath} from "../Routing/routes.ts";
import {NotificationTemplates} from "./NotificationTemplates.ts";
import { button } from "@targoninc/jess-components";
import {SearchContext} from "@targoninc/lyda-shared/src/Enums/SearchContext";
import {UserWidgetContext} from "../Enums/UserWidgetContext.ts";

export class NavTemplates {
    static navTop() {
        currentUser.subscribe(async () => {
            await UserActions.getNotifications();
        });
        const burgerMenuOpen = signal(false);

        return create("nav")
            .id("navTop")
            .children(
                NavTemplates.navLogo(),
                NavTemplates.burgerMenu(burgerMenuOpen),
                when(burgerMenuOpen, NavTemplates.burgerMenuContent(burgerMenuOpen)),
                create("div")
                    .classes("flex", "flex-grow")
                    .children(
                        NavTemplates.navButton(RoutePath.following, "Feed", "rss_feed"),
                        NavTemplates.navButton(RoutePath.explore, "Explore", "explore"),
                        NavTemplates.navButton(RoutePath.library, "Library", "category"),
                        SearchTemplates.search(SearchContext.navBar),
                    ).build(),
                when(currentUser, NavTemplates.accountSection()),
                when(currentUser, NavTemplates.notSignedInNote(), true)
            ).build();
    }

    static navLogo() {
        return create("div")
            .classes("nav-logo", "hideOnMidBreakpoint", "pointer")
            .onclick(reload)
            .children(
                GenericTemplates.icon(Icons.LYDA, true, ["icon", "svg"]),
            ).build();
    }

    static burgerMenu(open: Signal<boolean>) {
        return create("div")
            .classes("burger-menu", "flexOnMidBreakpoint", "flex", "clickable")
            .onclick(() => open.value = true)
            .children(
                GenericTemplates.icon(Icons.BURGER, true, ["nopointer", "icon", "svg", "align-center"], "Open Menu")
            ).build();
    }

    static burgerMenuContent(open: Signal<boolean>) {
        return create("div")
            .classes("burger-menu-content", "padded-page", "flex-v")
            .children(
                create("div")
                    .classes("flex", "clickable", "burger-menu-topbar")
                    .onclick(() => open.value = false)
                    .children(
                        create("div")
                            .children(
                                create("img")
                                    .classes("icon", "svg")
                                    .attributes("src", Icons.LYDA, "alt", "Lyda")
                                    .build()
                            ).build(),
                        create("div")
                            .classes("mobile-menu-close")
                            .children(
                                create("img")
                                    .classes("icon", "svg", "nopointer")
                                    .attributes("src", Icons.X, "alt", "X")
                                    .build(),
                            ).build(),
                    ).build(),
                NavTemplates.navButtonInBurger(RoutePath.following, "Feed", "rss_feed", async () => {
                    open.value = false;
                    navigate(RoutePath.following);
                }),
                NavTemplates.navButtonInBurger(RoutePath.following, "Explore", "explore", async () => {
                    open.value = false;
                    navigate(RoutePath.explore);
                }),
                NavTemplates.navButtonInBurger(RoutePath.following, "Library", "category", async () => {
                    open.value = false;
                    navigate(RoutePath.library);
                }),
            ).build();
    }

    static navButton(pageRoute: RoutePath, text: string, icon: StringOrSignal) {
        const active = compute(r => r && r.path === pageRoute, router.currentRoute);
        const activeClass = compute((a): string => a ? "active" : "_", active);

        return button({
            text,
            icon: {
                icon,
                adaptive: true,
                classes: ["inline-icon", "svg", "nopointer"]
            },
            onclick: () => navigate(pageRoute),
            classes: ["hideOnMidBreakpoint", activeClass],
            id: pageRoute,
        });
    }

    static navButtonInBurger(id: string, text: string, icon: string, clickFunc: Function) {
        const active = compute(r => r && r.path === id, router.currentRoute);
        const activeClass = compute((a): string => a ? "active" : "_", active);

        return button({
            text,
            icon: { icon, adaptive: true, classes: ["inline-icon", "svg", "nopointer"] },
            onclick: clickFunc,
            classes: ["text-xxlarge", "burger-menu-button", activeClass],
            id,
        });
    }

    static accountSection() {
        return create("div")
            .classes("widest-fill-right", "relative")
            .children(
                button({
                    text: "Upload",
                    classes: ["hideOnMidBreakpoint", "positive"],
                    icon: { icon: "upload" },
                    onclick: async (e: MouseEvent) => {
                        e.preventDefault();
                        navigate(RoutePath.upload);
                    }
                }),
                NotificationTemplates.notifications(),
                UserTemplates.userWidget(currentUser, [], [], UserWidgetContext.nav),
            ).build();
    }

    static notSignedInNote() {
        return create("div")
            .classes("widest-fill-right")
            .children(
                button({
                    text: "Log in",
                    icon: { icon: "login" },
                    classes: ["special"],
                    disabled: compute((r) => (r && r.path === "login") as boolean, router.currentRoute),
                    onclick: () => navigate(RoutePath.login)
                })
            ).build();
    }
}