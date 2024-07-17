import {NavTemplates} from "../../Templates/NavTemplates.mjs";
import {GenericTemplates} from "../../Templates/GenericTemplates.mjs";

export class NotificationParser {
    static parse(message, data) {
        const messageParts = this.getMessageWithLinkTags(data, message);
        const elements = [];
        for (let part of messageParts) {
            if (part.type === "plain") {
                elements.push(GenericTemplates.textWithHtml(part.text));
            } else {
                const relativeLink = `/${part.type}/${NotificationParser.getLinkIdentifierByType(part.type, part.text, part.collection)}`;
                const link = NavTemplates.notificationLink(relativeLink, NotificationParser.getDisplayTextByType(part.type, part.text, part.collection));
                elements.push(link);
            }
        }
        let image;
        if (data && data.users && data.users.length > 0) {
            const user = data.users[0];
            image = {
                type: "user",
                id: user.id,
            };
        }
        return {
            elements,
            image
        };
    }

    static getDisplayTextByType(type, id, collection) {
        switch (type) {
        case "profile":
            return collection.find(item => item.id === id).username;
        case "track":
            return collection.find(item => item.id === id).title;
        case "album":
            return collection.find(item => item.id === id).name;
        case "playlist":
            return collection.find(item => item.id === id).name;
        }
        return id;
    }

    static getLinkIdentifierByType(type, id, collection) {
        switch (type) {
        case "profile":
            return collection.find(item => item.id === id).username;
        }
        return id;
    }

    static getMessageWithLinkTags(data, message) {
        if (!data) {
            return [{type: "plain", text: message}];
        }

        const entities = {
            "@": {collection: data.users, type: "profile"},
            "#": {collection: data.tracks, type: "track"},
            "~": {collection: data.albums, type: "album"},
            "%": {collection: data.playlists, type: "playlist"},
        };

        let regExp = new RegExp("([@#~%])(\\d+)", "g");
        let match, lastIndex = 0;
        let elements = [];

        while ((match = regExp.exec(message)) !== null) {
            const entityKey = match[1];
            const id = match[2];

            if (match.index > lastIndex) {
                elements.push({
                    type: "plain",
                    text: message.substring(lastIndex, match.index)
                });
            }

            if (entities[entityKey]) {
                elements.push({
                    type: entities[entityKey].type,
                    text: id,
                    collection: entities[entityKey].collection
                });
            }

            lastIndex = regExp.lastIndex;
        }

        if (lastIndex < message.length) {
            elements.push({
                type: "plain",
                text: message.substring(lastIndex)
            });
        }

        return elements;
    }
}