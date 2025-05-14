import {Notification} from "../Models/DbModels/lyda/Notification.ts";
import {NotificationParser} from "../Classes/Helpers/NotificationParser.ts";
import {create, ifjs, signalMap} from "../../fjsc/src/f2.ts";
import {Time} from "../Classes/Helpers/Time.ts";
import {navigate} from "../Routing/Router.ts";
import {copy, Util} from "../Classes/Util.ts";
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {UserActions} from "../Actions/UserActions.ts";
import {FJSC} from "../../fjsc";
import { notifications } from "../state.ts";
import {UserTemplates} from "./account/UserTemplates.ts";
import {NotificationPart} from "../Models/NotifcationPart.ts";

export class NotificationTemplates {
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
                            .classes("flex", "align-children", "small-gap")
                            .children(...elements)
                            .build(),
                        create("span")
                            .classes("text-xsmall")
                            .text(Time.ago(notification.created_at))
                            .build()
                    ).build()
            ).build();
    }

    static notificationLink(notification: Notification, part: NotificationPart) {
        const link = `/${part.type}/${NotificationParser.getLinkIdentifierByType(part.type, part.id, notification.references!)}`;
        const text = NotificationParser.getDisplayTextByType(part.type, part.id, notification.references!);

        return create("span")
            .classes("inlineLink", "flex", "align-children", "small-gap")
            .onclick(async () => {
                navigate(link);
            })
            .onauxclick(async e => {
                if (e.button === 2) {
                    e.preventDefault();
                    await copy(window.location.origin + link);
                } else if (e.button === 1) {
                    e.preventDefault();
                    window.open(window.location.origin + link, "_blank");
                }
            })
            .children(
                ifjs(part.type === "profile", UserTemplates.userIcon(part.id, Util.getUserAvatar(part.id))),
                create("span")
                    .text(text),
            ).build();
    }

    static notifications() {
        const hasNotifs = compute(notifs => notifs.length > 0, notifications);
        const unreadNotifications = compute(notifs => notifs.filter(notification => !notification.is_read), notifications);
        const notifsClass = compute((u): string => u.length > 0 ? "unread" : "_", unreadNotifications);
        const newestTimestamp = compute(unreadNotifs => unreadNotifs.length > 0 ? new Date(unreadNotifs[0].created_at) : null, unreadNotifications);

        const notifsVisible = signal(false);
        const notificationContainer = NotificationTemplates.notificationContainer(notifsVisible, hasNotifs);

        UserActions.getNotificationsPeriodically();
        return create("div")
            .classes("notification-container", "relative")
            .children(
                FJSC.button({
                    icon: { icon: "notifications" },
                    onclick: async () => {
                        notifsVisible.value = !notifsVisible.value;
                        if (notifsVisible.value) {
                            await UserActions.markNotificationsAsRead(newestTimestamp);
                        }
                    },
                    text: "",
                    classes: ["fullHeight", "round-on-tiny-breakpoint", notifsClass]
                }),
                notificationContainer
            ).build();
    }

    private static notificationContainer(notifsVisible: Signal<boolean>, hasNotifs: Signal<boolean>) {
        return ifjs(notifsVisible, create("div")
            .classes("popout-below", "rounded", "absolute-align-right", "notification-list")
            .children(
                signalMap(notifications, create("div").classes("flex-v", "nogap"), notif => NotificationTemplates.notificationInList(notif)),
                ifjs(hasNotifs, create("div")
                    .classes("text-center", "padded")
                    .text("No notifications")
                    .build(), true)
            ).build());
    }
}