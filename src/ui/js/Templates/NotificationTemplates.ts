import {NotificationParser} from "../Classes/Helpers/NotificationParser.ts";
import {create, when, nullElement, signalMap, StringOrSignal, compute, Signal, signal} from "@targoninc/jess";
import {Time} from "../Classes/Helpers/Time.ts";
import {navigate} from "../Routing/Router.ts";
import {copy, Util} from "../Classes/Util.ts";
import {UserActions} from "../Actions/UserActions.ts";
import {notifications} from "../state.ts";
import {Images} from "../Enums/Images.ts";
import {button} from "@targoninc/jess-components";
import {Notification} from "@targoninc/lyda-shared/src/Models/db/lyda/Notification";
import {NotificationPart} from "@targoninc/lyda-shared/src/Models/NotifcationPart";

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
                NotificationTemplates.referenceImage(part),
                create("span")
                    .text(text),
            ).build();
    }

    static referenceIcon(image: StringOrSignal, fallback: StringOrSignal) {
        const img = create("img")
            .classes("user-icon", "align-center", "nopointer")
            .attributes("src", image)
            .onerror(() => {
                img.src(fallback);
            });

        return img;
    }

    static referenceImage(part: NotificationPart) {
        if (!part.id) {
            return nullElement();
        }

        switch (part.type) {
            case "profile":
                return NotificationTemplates.referenceIcon(Util.getUserAvatar(part.id), Images.DEFAULT_AVATAR);
            case "track":
                return NotificationTemplates.referenceIcon(Util.getTrackCover(part.id), Images.DEFAULT_COVER_TRACK);
            case "album":
                return NotificationTemplates.referenceIcon(Util.getAlbumCover(part.id), Images.DEFAULT_COVER_ALBUM);
            case "playlist":
                return NotificationTemplates.referenceIcon(Util.getPlaylistCover(part.id), Images.DEFAULT_COVER_PLAYLIST);
        }

        return nullElement();
    }

    static notifications() {
        const hasNotifs = compute(notifs => notifs.length > 0, notifications);
        const unreadNotifications = compute(notifs => notifs.filter(notification => !notification.is_read), notifications);
        const notifsClass = compute((u): string => u.length > 0 ? "unread" : "_", unreadNotifications);
        const newestTimestamp = compute(unreadNotifs => unreadNotifs.length > 0 ? new Date(unreadNotifs[0].created_at) : null, unreadNotifications);
        const notifsVisible = signal(false);

        UserActions.getNotificationsPeriodically();
        return create("div")
            .classes("notification-container", "relative")
            .children(
                button({
                    icon: {icon: "notifications"},
                    onclick: async () => {
                        notifsVisible.value = !notifsVisible.value;
                        if (notifsVisible.value) {
                            await UserActions.markNotificationsAsRead(newestTimestamp);
                        }
                    },
                    text: "",
                    classes: ["fullHeight", "round-on-tiny-breakpoint", notifsClass]
                }),
                NotificationTemplates.notificationContainer(notifsVisible, hasNotifs)
            ).build();
    }

    private static notificationContainer(notifsVisible: Signal<boolean>, hasNotifs: Signal<boolean>) {
        return when(notifsVisible, create("div")
            .classes("popout-below", "rounded", "absolute-align-right", "notification-list")
            .children(
                signalMap(notifications, create("div").classes("flex-v", "nogap"), notif => NotificationTemplates.notificationInList(notif)),
                when(hasNotifs, create("div")
                    .classes("text-center", "padded")
                    .text("No notifications")
                    .build(), true)
            ).build());
    }
}