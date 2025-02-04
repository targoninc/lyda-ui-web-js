import {Icons} from "../Enums/Icons.js";
import {UserTemplates} from "./UserTemplates.ts";
import {UserActions} from "../Actions/UserActions.ts";
import {NavActions} from "../Actions/NavActions.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {SearchTemplates} from "./SearchTemplates.ts";
import {NotificationParser} from "../Classes/Helpers/NotificationParser.ts";
import {AuthActions} from "../Actions/AuthActions.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {Util} from "../Classes/Util.ts";
import {navigate, reload} from "../Routing/Router.ts";
import {AnyNode, create, ifjs, signalMap, StringOrSignal} from "../../fjsc/src/f2.ts";
import {compute, signal} from "../../fjsc/src/signals.ts";
import {Notification} from "../Models/DbModels/lyda/Notification.ts";
import {FJSC} from "../../fjsc";
import {router} from "../../main.ts";
import {UserWidgetContext} from "../Enums/UserWidgetContext.ts";
import {currentUser, notifications} from "../state.ts";
import {SearchContext} from "../Enums/SearchContext.ts";

export class NavTemplates {
    static navTop() {
        currentUser.subscribe(async () => {
            await UserActions.getNotifications();
        });

        return create("nav")
            .id("navTop")
            .children(
                NavTemplates.navLogo(),
                NavTemplates.burgerMenu(),
                NavTemplates.burgerMenuContent(),
                create("div")
                    .classes("flex", "flex-grow")
                    .children(
                        NavTemplates.navButton("following", "Feed", "rss_feed", async () => {
                            navigate("following");
                        }),
                        NavTemplates.navButton("explore", "Explore", "explore", async () => {
                            navigate("explore");
                        }),
                        NavTemplates.navButton("library", "Library", "category", async () => {
                            navigate("library");
                        }),
                        SearchTemplates.search(SearchContext.navBar),
                    ).build(),
                ifjs(currentUser, NavTemplates.accountSection()),
                ifjs(currentUser, NavTemplates.notSignedInNote(), true)
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

    static burgerMenu() {
        return create("div")
            .classes("burger-menu", "flexOnMidBreakpoint", "flex", "clickable")
            .onclick(NavActions.openBurgerMenu)
            .children(
                GenericTemplates.icon(Icons.BURGER, true, ["nopointer", "icon", "svg", "align-center"], "Open Menu")
            ).build();
    }

    static burgerMenuContent() {
        return create("div")
            .classes("burger-menu-content", "hidden", "padded-page", "flex-v")
            .children(
                create("div")
                    .classes("flex", "clickable", "burger-menu-topbar")
                    .onclick(NavActions.closeBurgerMenu)
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
                NavTemplates.navButtonInBurger("following", "Feed", "rss_feed", async () => {
                    NavActions.closeBurgerMenu();
                    navigate("following");
                }),
                NavTemplates.navButtonInBurger("explore", "Explore", "explore", async () => {
                    NavActions.closeBurgerMenu();
                    navigate("explore");
                }),
                NavTemplates.navButtonInBurger("library", "Library", "category", async () => {
                    NavActions.closeBurgerMenu();
                    navigate("library");
                }),
            ).build();
    }

    static navButton(id: string, text: string, icon: StringOrSignal, clickFunc: Function) {
        const active = compute(r => r && r.path === id, router.currentRoute);
        const activeClass = compute((a): string => a ? "active" : "_", active);

        return FJSC.button({
            text,
            icon: {
                icon,
                adaptive: true,
                classes: ["inline-icon", "svg", "nopointer"]
            },
            onclick: clickFunc,
            classes: ["hideOnMidBreakpoint", activeClass],
            id,
        });
    }

    static navButtonInBurger(id: string, text: string, icon: string, clickFunc: Function) {
        const active = compute(r => r && r.path === id, router.currentRoute);
        const activeClass = compute((a): string => a ? "active" : "_", active);

        return FJSC.button({
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
                FJSC.button({
                    text: "Upload",
                    classes: ["hideOnMidBreakpoint", "positive"],
                    icon: { icon: "upload" },
                    onclick: async (e: MouseEvent) => {
                        e.preventDefault();
                        navigate("upload");
                    }
                }),
                NavTemplates.notifications(),
                UserTemplates.userWidget(currentUser, true, [], [], UserWidgetContext.nav),
                FJSC.button({
                    text: "Log out",
                    classes: ["hideOnSmallBreakpoint", "negative"],
                    icon: { icon: "logout" },
                    onclick: async () => {
                        await AuthActions.logOut();
                    }
                }),
            ).build();
    }

    static notSignedInNote() {
        return create("div")
            .classes("widest-fill-right")
            .children(
                FJSC.button({
                    text: "Log in",
                    icon: { icon: "login" },
                    classes: ["special"],
                    disabled: compute((r) => (r && r.path === "login") as boolean, router.currentRoute),
                    onclick: async () => {
                        navigate("login");
                    }
                })
            ).build();
    }

    static notificationInList(notification: Notification) {
        const elements = NotificationParser.parse(notification);

        return create("div")
            .classes("listNotification", "flex", notification.type, "rounded", "padded-inline", "hoverable", "text-left", notification.is_read ? "read" : "unread")
            .id(notification.id)
            .children(
                create("div")
                    .classes("flex-v", "no-gap")
                    .children(
                        create("span")
                            .children(...elements)
                            .build(),
                        create("span")
                            .classes("notification-time", "text-small")
                            .text(Time.ago(notification.created_at))
                            .build()
                    ).build()
            ).build();
    }

    static notificationImage(image: { type: string, id: string }) {
        const type = image.type;
        const id = image.id;
        const srcState = signal("");
        srcState.value = Util.getUserAvatar(parseInt(id));

        if (type === "user") {
            return create("img")
                .classes("nopointer", "user-icon-big", "align-center")
                .attributes("src", srcState)
                .build();
        }

        return null;
    }

    static notificationLink(link: string, text: string) {
        return create("span")
            .classes("inlineLink")
            .onclick(async () => {
                navigate(link);
            })
            .onauxclick(async e => {
                if (e.button === 2) {
                    e.preventDefault();
                    await navigator.clipboard.writeText(window.location.origin + link);
                } else if (e.button === 1) {
                    e.preventDefault();
                    window.open(window.location.origin + link, "_blank");
                }
            })
            .text(text)
            .build();
    }

    static notifications() {
        const hasNotifs = compute(notifs => notifs.length > 0, notifications);
        const unreadNotifications = compute(notifs => notifs.filter(notification => !notification.is_read), notifications);
        const notifsClass = compute(u => u.length > 0 ? "unread" : "_", unreadNotifications);
        const newestTimestamp = compute(unreadNotifs => unreadNotifs.length > 0 ? unreadNotifs[0].created_at : null, unreadNotifications);

        const notifsVisible = signal(false);
        const listClass = compute(v => v ? "_" : "hidden", notifsVisible);

        const notificationContainer = create("div")
            .classes(listClass, "popout-below", "rounded", "absolute-align-right", "notification-list")
            .children(
                signalMap(notifications, create("div").classes("flex-v", "nogap"), notif => NavTemplates.notificationInList(notif)),
                ifjs(hasNotifs, create("div")
                    .classes("text-center", "padded")
                    .text("No notifications")
                    .build(), true)
            ).build();

        UserActions.getNotificationsPeriodically();
        return create("div")
            .classes("notification-container", "relative")
            .children(
                FJSC.button({
                    icon: { icon: "notifications" },
                    onclick: async () => {
                        notifsVisible.value = !notifsVisible.value;
                        await UserActions.markNotificationsAsRead(newestTimestamp, notifsVisible);
                    },
                    text: "",
                    classes: ["fullHeight", "round-on-tiny-breakpoint", notifsClass]
                }),
                notificationContainer
            ).build();
    }
}