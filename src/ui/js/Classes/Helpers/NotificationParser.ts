import {GenericTemplates} from "../../Templates/generic/GenericTemplates.ts";
import {NotificationTemplates} from "../../Templates/NotificationTemplates.ts";
import {Notification} from "@targoninc/lyda-shared/src/Models/db/lyda/Notification";
import {NotificationReference} from "@targoninc/lyda-shared/src/Models/NotificationReference";
import {NotificationPart} from "@targoninc/lyda-shared/src/Models/NotifcationPart";

export class NotificationParser {
    static parse(notification: Notification) {
        const messageParts = NotificationParser.getMessageParts(notification.message);
        const elements = [];
        for (let part of messageParts) {
            if (part.type === "text") {
                elements.push(GenericTemplates.textWithHtml(part.text));
            } else {
                if (notification.references) {
                    const link = NotificationTemplates.notificationLink(notification, part);
                    elements.push(link);
                }
            }
        }
        return elements;
    }

    static getDisplayTextByType(type: string, id: number|undefined, refs: NotificationReference[]) {
        switch (type) {
            case "profile":
                return refs.find(item => item.type === "u" && item.id === id)?.object.username;
            case "track":
                return refs.find(item => item.type === "t" && item.id === id)?.object.title;
            case "album":
                return refs.find(item => item.type === "a" && item.id === id)?.object.title;
            case "playlist":
                return refs.find(item => item.type === "p" && item.id === id)?.object.title;
        }
        return id;
    }

    static getLinkIdentifierByType(type: string, id: any, refs: NotificationReference[]) {
        switch (type) {
            case "profile":
                return refs.find(item => item.id === id)?.object.username;
        }
        return id;
    }

    static getMessageParts(message: string): NotificationPart[] {
        const entities: { [key: string]: string } = {
            "u": "profile",
            "t": "track",
            "a": "album",
            "p": "playlist",
        };

        const result: NotificationPart[] = [];

        // Regex to match `{entity:id|text}` pattern
        const regex = /\{([utap]:\d+)}/g;

        let lastIndex = 0;
        let match;

        // Iterating over all matches in the message string
        while ((match = regex.exec(message)) !== null) {
            const [fullMatch, entityId] = match;
            const [entity, id] = entityId.split(':');

            // Push plain text before the match
            if (match.index > lastIndex) {
                const plainText = message.slice(lastIndex, match.index);
                result.push({type: 'text', text: plainText});
            }

            // Push matched tag with its parsed details
            if (entities[entity]) {
                result.push({
                    type: entities[entity],
                    id: parseInt(id),
                });
            }

            // Update the last index pointer
            lastIndex = match.index + fullMatch.length;
        }

        // Push remaining plain text after the last match
        if (lastIndex < message.length) {
            result.push({type: 'text', text: message.slice(lastIndex)});
        }

        return result;
    }
}
