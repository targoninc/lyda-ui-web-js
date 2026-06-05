import {NotificationParser} from "../Classes/Helpers/NotificationParser.ts";
import {create, when, nullElement, signalMap, StringOrSignal, compute, signal} from "@targoninc/jess";
import {navigate} from "../Routing/Router.ts";
import {copy, Util} from "../Classes/Util.ts";
import {UserActions} from "../Actions/UserActions.ts";
import {notifications} from "../state.ts";
import {Images} from "../Enums/Images.ts";
import {button} from "@targoninc/jess-components";
import {Notification} from "@targoninc/lyda-shared/src/Models/db/lyda/Notification";
import {NotificationPart} from "@targoninc/lyda-shared/src/Models/NotifcationPart";
import {Api} from "../Api/Api.ts";
import {t} from "../../locales";
import { GenericTemplates } from "./generic/GenericTemplates.ts";
import { PopoverTemplates } from "./generic/PopoverTemplates.ts";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType";

export class NotificationTemplates {
    static notificationInList(notification: Notification) {
        const elements = NotificationParser.parse(notification);

        return create("div")
            .classes("listNotification", "flex", notification.type, "padded-inline", "hoverable", "text-left", notification.is_read ? "read" : "unread")
            .id(notification.id)
            .children(
                create("div")
                    .classes("flex-v", "no-gap")
                    .children(
                        create("span")
                            .classes("flex", "align-children", "small-gap")
                            .children(...elements)
                            .build(),
                        GenericTemplates.timestamp(notification.created_at)
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
            case "profile": {
                const avatar = signal(Images.DEFAULT_AVATAR);
                Util.getCachedUserAvatar(part.id).then(url => { avatar.value = url; });
                return NotificationTemplates.referenceIcon(avatar, Images.DEFAULT_AVATAR);
            }
            case "track": {
                const cover = signal(Images.DEFAULT_COVER_TRACK);
                Util.getCachedImage(part.id, MediaFileType.trackCover).then(url => { cover.value = url; });
                return NotificationTemplates.referenceIcon(cover, Images.DEFAULT_COVER_TRACK);
            }
            case "album": {
                const cover = signal(Images.DEFAULT_COVER_ALBUM);
                Util.getCachedImage(part.id, MediaFileType.albumCover).then(url => { cover.value = url; });
                return NotificationTemplates.referenceIcon(cover, Images.DEFAULT_COVER_ALBUM);
            }
            case "playlist": {
                const cover = signal(Images.DEFAULT_COVER_PLAYLIST);
                Util.getCachedImage(part.id, MediaFileType.playlistCover).then(url => { cover.value = url; });
                return NotificationTemplates.referenceIcon(cover, Images.DEFAULT_COVER_PLAYLIST);
            }
        }

        return nullElement();
    }

    static notifications() {
        const hasNotifs = compute(notifs => notifs.length > 0, notifications);
        const unreadNotifications = compute(notifs => notifs.filter(notification => !notification.is_read), notifications);
        const unreadClass = compute((u): string => u.length > 0 ? "unread" : "_", unreadNotifications);
        const newestTimestamp = compute(unreadNotifs => unreadNotifs.length > 0 ? new Date(unreadNotifs[0].created_at) : null, unreadNotifications);

        UserActions.getNotificationsPeriodically();

        const popover = PopoverTemplates.manualPopover("notification-popover",
            create("div")
                .classes("notification-list", "flex-v")
                .children(
                    signalMap(notifications, create("div").classes("flex-v", "nogap"), notif => NotificationTemplates.notificationInList(notif)),
                    when(hasNotifs, create("div")
                        .classes("text-center", "padded")
                        .text(t("NO_NOTIFICATIONS"))
                        .build(), true),
                ).build(),
        );

        popover.addEventListener("toggle", () => {
            const open = popover.matches(":popover-open");
            btn.classList.toggle("active", open);
            if (open) {
                Api.markNotificationsAsRead(newestTimestamp).then(() => {
                    notifications.value = notifications.value.map(n => ({ ...n, is_read: true }));
                });
            }
        });

        const btn = button({
            icon: {icon: "notifications"},
            onclick: () => PopoverTemplates.toggle(popover, btn, true),
            text: "",
            classes: ["fullHeight", "round-on-tiny-breakpoint", unreadClass],
        }) as HTMLButtonElement;

        return create("div")
            .classes("notification-container", "relative")
            .children(btn, popover)
            .build();
    }
}