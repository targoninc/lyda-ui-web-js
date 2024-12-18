import {Icons} from "../Enums/Icons.js";
import {UserTemplates} from "./UserTemplates.ts";
import {UserActions} from "../Actions/UserActions.ts";
import {NavActions} from "../Actions/NavActions.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {Links} from "../Enums/Links.ts";
import {SearchTemplates} from "./SearchTemplates.ts";
import {NotificationParser} from "../Classes/Helpers/NotificationParser.ts";
import {AuthActions} from "../Actions/AuthActions.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {Util} from "../Classes/Util.ts";
import {navigate} from "../Routing/Router.ts";
import {AnyNode, create, StringOrSignal} from "../../fjsc/src/f2.ts";
import {compute, signal} from "../../fjsc/src/signals.ts";
import {User} from "../Models/DbModels/User.ts";
import {Notification} from "../Models/DbModels/Notification.ts";
import {FJSC} from "../../fjsc";
import {router} from "../../main.ts";

export class NavTemplates {
    static navTop(userTemplate: AnyNode) {
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
                        SearchTemplates.search(),
                    ).build(),
                userTemplate
            ).build();
    }

    static navLogo() {
        return create("div")
            .classes("nav-logo", "hideOnMidBreakpoint", "pointer")
            .onclick(async () => {
                navigate("explore");
            })
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
                        create("img")
                            .classes("icon", "svg", "nopointer")
                            .attributes("src", Icons.X, "alt", "X")
                            .build(),
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

    static accountSection(user: User, notifications: Notification[]) {
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
                NavTemplates.notifications(notifications),
                UserTemplates.userWidget(user, true),
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
                GenericTemplates.action(Icons.LOGIN, "Log in", "login", async () => {
                    navigate("login");
                })
            )
            .build();
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
        Util.getAvatarFromUserIdAsync(id).then((src) => {
            srcState.value = src;
        });

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

    static notifications(notifications: Notification[]) {
        let notificationList;
        if (!notifications || notifications.length === 0 || notifications.constructor !== Array) {
            notificationList = [
                create("div")
                    .classes("text-center", "padded")
                    .text("No notifications")
                    .build()
            ];
        } else {
            notificationList = [];
            for (let notification of notifications) {
                notificationList.push(NavTemplates.notificationInList(notification));
            }
        }
        let unreadNotifications = notifications.filter(notification => !notification.is_read);

        const notificationContainer = create("div")
            .classes("hidden", "popout-below", "rounded", "absolute-align-right", "notification-list")
            .children(...notificationList)
            .build();

        const notificationButton = FJSC.button({
            icon: { icon: "notifications" },
            onclick: UserActions.markNotificationsAsRead,
            text: "",
            classes: ["fullHeight"]
        });
        /*
                create("div")
                    .classes("nopointer", "notification-bubble", unreadNotifications.length === 0 ? "hidden" : "_")
                    .build()
         */

        UserActions.getNotificationsPeriodically(notificationButton);
        return create("div")
            .classes("notification-container", "relative")
            .children(
                notificationButton,
                notificationContainer
            ).build();
    }
}