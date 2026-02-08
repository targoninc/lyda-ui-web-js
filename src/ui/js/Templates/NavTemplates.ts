import { Icons } from "../Enums/Icons.ts";
import { UserTemplates } from "./account/UserTemplates.ts";
import { UserActions } from "../Actions/UserActions.ts";
import { GenericTemplates } from "./generic/GenericTemplates.ts";
import { SearchTemplates } from "./SearchTemplates.ts";
import { navigate, reload } from "../Routing/Router.ts";
import { compute, create, Signal, StringOrSignal, when } from "@targoninc/jess";
import { router } from "../../main.ts";
import { currentUser } from "../state.ts";
import { RoutePath } from "../Routing/routes.ts";
import { NotificationTemplates } from "./NotificationTemplates.ts";
import { button } from "@targoninc/jess-components";
import { SearchContext } from "@targoninc/lyda-shared/src/Enums/SearchContext";
import { UserWidgetContext } from "../Enums/UserWidgetContext.ts";
import { t } from "../../locales";
import { TextSize } from "../Enums/TextSize.ts";

export class NavTemplates {
    static navTop(burgerMenuOpen: Signal<boolean>) {
        currentUser.subscribe(async () => {
            await UserActions.getNotifications();
        });

        return create("nav")
            .id("navTop")
            .children(
                NavTemplates.navLogo(),
                NavTemplates.burgerMenu(burgerMenuOpen),
                create("div")
                    .classes("flex", "flex-grow")
                    .children(
                        NavTemplates.navButton(RoutePath.library, t("LIBRARY"), "category"),
                        NavTemplates.navButton(RoutePath.following, t("FEED"), "rss_feed"),
                        NavTemplates.navButton(RoutePath.explore, t("EXPLORE"), "explore"),
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
                GenericTemplates.icon(Icons.BURGER, true, ["nopointer", "icon", "svg", "align-center"], t("OPEN_MENU")),
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
                            .classes("mobile-menu-close")
                            .children(
                                create("img")
                                    .classes("icon", "svg", "nopointer")
                                    .attributes("src", Icons.X, "alt", "X")
                                    .build(),
                            ).build(),
                    ).build(),
                NavTemplates.navButtonInBurger(RoutePath.following, t("LIBRARY"), "category", async () => {
                    open.value = false;
                    navigate(RoutePath.library);
                }),
                NavTemplates.navButtonInBurger(RoutePath.following, t("FEED"), "rss_feed", async () => {
                    open.value = false;
                    navigate(RoutePath.following);
                }),
                NavTemplates.navButtonInBurger(RoutePath.following, t("EXPLORE"), "explore", async () => {
                    open.value = false;
                    navigate(RoutePath.explore);
                }),
            ).build();
    }

    static navButton(pageRoute: RoutePath, text: StringOrSignal, icon: StringOrSignal) {
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

    static navButtonInBurger(id: string, text: StringOrSignal, icon: string, clickFunc: Function) {
        const active = compute(r => r && r.path === id, router.currentRoute);
        const activeClass = compute((a): string => a ? "active" : "_", active);

        return button({
            text,
            icon: { icon, adaptive: true, classes: ["inline-icon", "svg", "nopointer"] },
            onclick: clickFunc,
            classes: [TextSize.xxLarge, "burger-menu-button", activeClass],
            id,
        });
    }

    static accountSection() {
        const isUploadPage = compute(r => r?.path === 'upload', router.currentRoute);
        const uploadActiveClass = compute((i): string => i ? "active" : "inactive", isUploadPage);

        return create("div")
            .classes("widest-fill-right", "relative")
            .children(
                button({
                    classes: ["hideOnMidBreakpoint", "fullHeight", uploadActiveClass],
                    icon: { icon: "upload" },
                    disabled: isUploadPage,
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
                    text: t("LOGIN"),
                    icon: { icon: "login" },
                    classes: ["special"],
                    disabled: compute((r) => (r && r.path === "login") as boolean, router.currentRoute),
                    onclick: () => navigate(RoutePath.login)
                })
            ).build();
    }
}