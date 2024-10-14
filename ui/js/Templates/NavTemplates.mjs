import {create, FjsObservable} from "https://fjs.targoninc.com/f.js";
import {Icons} from "../Enums/Icons.mjs";
import {UserTemplates} from "./UserTemplates.mjs";
import {UserActions} from "../Actions/UserActions.mjs";
import {NavActions} from "../Actions/NavActions.mjs";
import {GenericTemplates} from "./GenericTemplates.mjs";
import {Links} from "../Enums/Links.mjs";
import {SearchTemplates} from "./SearchTemplates.mjs";
import {NotificationParser} from "../Classes/Helpers/NotificationParser.mjs";
import {AuthActions} from "../Actions/AuthActions.mjs";
import {Time} from "../Classes/Helpers/Time.mjs";
import {Util} from "../Classes/Util.mjs";

export class NavTemplates {
    static navTop(userTemplate) {
        return create("nav")
            .id("navTop")
            .children(
                NavTemplates.navLogo(),
                NavTemplates.burgerMenu(),
                NavTemplates.burgerMenuContent(),
                create("div")
                    .classes("flex", "flexGrow")
                    .children(
                        NavTemplates.navButton("following", "Feed", Icons.PEOPLE, async () => {
                            window.router.navigate("following");
                        }),
                        NavTemplates.navButton("explore", "Explore", Icons.STARS, async () => {
                            window.router.navigate("explore");
                        }),
                        NavTemplates.navButton("library", "Library", Icons.LIKE, async () => {
                            window.router.navigate("library");
                        }),
                        SearchTemplates.search(),
                    ).build(),
                userTemplate
            )
            .build();
    }
    static navLogo() {
        return create("div")
            .classes("nav-logo", "hideOnMidBreakpoint", "pointer")
            .onclick(async () => {
                await window.router.navigate("explore");
            })
            .children(
                create("img")
                    .classes("icon", "svg")
                    .attributes("src", Icons.LYDA, "alt", "Lyda")
                    .build()
            )
            .build();
    }
    static burgerMenu() {
        return create("div")
            .classes("burger-menu", "flexOnMidBreakpoint", "flex", "clickable")
            .onclick(NavActions.openBurgerMenu)
            .children(
                create("img")
                    .classes("nopointer", "icon", "svg", "align-center")
                    .attributes("src", Icons.BURGER, "alt", "Menu")
                    .build()
            )
            .build();
    }
    static burgerMenuContent() {
        return create("div")
            .classes("burger-menu-content", "hidden", "padded-page", "flex-v")
            .children(
                create("div")
                    .classes("flex", "clickable")
                    .onclick(NavActions.closeBurgerMenu)
                    .children(
                        create("img")
                            .classes("icon", "svg", "nopointer")
                            .attributes("src", Icons.X, "alt", "X")
                            .build(),
                        create("div")
                            .children(
                                create("img")
                                    .classes("icon", "svg")
                                    .attributes("src", Icons.LYDA, "alt", "Lyda")
                                    .build()
                            )
                            .build()
                    )
                    .build(),
                NavTemplates.navButtonInBurger("following", "Feed", Icons.PEOPLE, async () => {
                    NavActions.closeBurgerMenu();
                    window.router.navigate("following");
                }),
                NavTemplates.navButtonInBurger("explore", "Explore", Icons.STARS, async () => {
                    NavActions.closeBurgerMenu();
                    window.router.navigate("explore");
                }),
                NavTemplates.navButtonInBurger("library", "Library", Icons.LIKE, async () => {
                    NavActions.closeBurgerMenu();
                    window.router.navigate("library");
                }),
            ).build();
    }

    static navButton(id, text, icon, clickFunc) {
        return create("div")
            .classes("nav", "flex", "small-gap", "clickable", "fakeButton", "padded-inline", "rounded", "hideOnMidBreakpoint")
            .id(id)
            .onclick(clickFunc)
            .children(
                create("img")
                    .classes("inline-icon", "svg", "nopointer")
                    .attributes("src", icon, "alt", text)
                    .build(),
                create("span")
                    .text(text)
                    .build()
            ).build();
    }

    static navButtonInBurger(id, text, icon, clickFunc) {
        return create("div")
            .classes("nav", "flex", "small-gap", "clickable", "fakeButton", "padded-inline", "rounded")
            .id(id)
            .onclick(clickFunc)
            .children(
                create("img")
                    .classes("inline-icon", "svg", "nopointer")
                    .attributes("src", icon, "alt", text)
                    .build(),
                create("span")
                    .classes("text-xxlarge", "nopointer")
                    .id(id)
                    .text(text)
                    .build()
            ).build();
    }

    static signedInNote(user, avatar, notifications) {
        return create("div")
            .classes("widest-fill-right", "relative")
            .children(
                GenericTemplates.actionWithMidBreakpoint(Icons.UPLOAD, "Upload", "upload", async e => {
                    e.preventDefault();
                    await window.router.navigate("upload");
                }, [], ["positive"], Links.LINK("upload")),
                NavTemplates.notifications(notifications),
                UserTemplates.userWidget(user.id, user.username, user.displayname, avatar, true, [], ["align-center"]),
                GenericTemplates.actionWithMidBreakpoint(Icons.LOGOUT, "Log out", "logout", async () => {
                    await AuthActions.logOut();
                }, [], ["negative"]),
            )
            .build();
    }

    static notSignedInNote() {
        return create("div")
            .classes("widest-fill-right")
            .children(
                GenericTemplates.action(Icons.LOGIN, "Log in", "login", async () => {
                    await window.router.navigate("login");
                })
            )
            .build();
    }

    static notificationInList(type, read, created_at, message, data) {
        const result = NotificationParser.parse(message, data);

        return create("div")
            .classes("listNotification", "flex", type, "rounded", "padded-inline", "hoverable", "text-left", read === true ? "read" : "unread")
            .attributes("data-created_at", created_at)
            .children(
                NavTemplates.notificationImage(result.image),
                create("div")
                    .classes("flex-v", "no-gap")
                    .children(
                        create("span")
                            .children(
                                ...result.elements
                            ).build(),
                        create("span")
                            .classes("notification-time", "text-small")
                            .text(Time.ago(created_at))
                            .build()
                    ).build()
            ).build();
    }

    static notificationImage(image) {
        const type = image.type;
        const id = image.id;
        const srcState = new FjsObservable("");
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

    static notificationLink(link, text) {
        return create("span")
            .classes("inlineLink")
            .onclick(async () => {
                await window.router.navigate(link);
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

    static notifications(notifications) {
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
                notificationList.push(
                    NavTemplates.notificationInList(notification.type, notification.isRead, notification.createdAt, notification.message, notification.data)
                );
            }
        }
        let unreadNotifications = notifications.filter(notification => notification.read === 0);

        const notificationContainer = create("div")
            .classes("hidden", "shadow", "popout-below", "rounded", "absolute-align-right", "notification-list")
            .children(...notificationList)
            .build();

        const notificationButton = create("div")
            .classes("fakeButton", "flex", "clickable", "rounded", "padded-inline")
            .styles("height", "24px")
            .children(
                create("img")
                    .classes("nopointer", "align-center", "inline-icon", "svg")
                    .attributes("src", Icons.BELL, "alt", "Notifications")
                    .build(),
                create("div")
                    .classes("nopointer", "notification-bubble", unreadNotifications.length === 0 ? "hidden" : "_")
                    .build()
            )
            .onclick(UserActions.markNotificationsAsRead)
            .build();

        UserActions.getNotificationsPeriodically(notificationButton);
        return create("div")
            .classes("align-center", "notification-container", "relative")
            .children(
                notificationButton,
                notificationContainer
            )
            .build();
    }
}