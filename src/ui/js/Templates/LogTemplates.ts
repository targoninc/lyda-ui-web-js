import {Time} from "../Classes/Helpers/Time.ts";
import {UserTemplates} from "./UserTemplates.ts";
import {GenericTemplates} from "./GenericTemplates.ts";
import {Util} from "../Classes/Util.ts";
import {create} from "../../fjsc/src/f2.ts";
import {User} from "../Models/DbModels/User.ts";

export class LogTemplates {
    static async actionLogs(selfUser: User, data: any[]) {
        const users = {};
        for (const log of data) {
            if (!users[log.user_id]) {
                users[log.user_id] = await Util.getUserAsync(log.user_id);
                users[log.user_id].avatarUrl = await Util.getAvatarFromUserIdAsync(log.user_id);
            }
            if (!users[log.actionedUserId]) {
                users[log.actionedUserId] = await Util.getUserAsync(log.actionedUserId);
                users[log.actionedUserId].avatarUrl = await Util.getAvatarFromUserIdAsync(log.actionedUserId);
            }
        }

        return create("table")
            .classes("logs")
            .attributes("cellspacing", "0", "cellpadding", "0")
            .children(
                create("thead")
                    .children(
                        create("tr")
                            .classes("log")
                            .children(
                                create("th")
                                    .classes("log-timestamp")
                                    .text("Timestamp")
                                    .build(),
                                create("th")
                                    .classes("log-user")
                                    .text("User")
                                    .build(),
                                create("th")
                                    .classes("log-action-name")
                                    .text("Action Name")
                                    .build(),
                                create("th")
                                    .classes("log-user")
                                    .text("Actioned User")
                                    .build(),
                                create("th")
                                    .classes("log-properties")
                                    .text("Properties")
                                    .build(),
                            ).build(),
                    ).build(),
                create("tbody")
                    .children(
                        ...data.map(l => {
                            return create("tr")
                                .classes("log", l.type)
                                .children(
                                    create("td")
                                        .classes("log-timestamp")
                                        .text(Time.ago(l.createdAt))
                                        .build(),
                                    create("td")
                                        .classes("log-user")
                                        .children(
                                            UserTemplates.userWidget(l.user_id, users[l.user_id].username, users[l.user_id].displayname, users[l.user_id].avatarUrl, users[l.user_id].follows.some(f => f.followingUserId === selfUser.id)),
                                        ).build(),
                                    create("td")
                                        .classes("log-action-name")
                                        .text(l.actionName)
                                        .build(),
                                    create("td")
                                        .classes("log-user")
                                        .children(
                                            UserTemplates.userWidget(l.actionedUserId, users[l.actionedUserId].username, users[l.actionedUserId].displayname, users[l.actionedUserId].avatarUrl, users[l.actionedUserId].follows.some(f => f.followingUserId === selfUser.id)),
                                        ).build(),
                                    LogTemplates.properties(l.additionalInfo),
                                ).build();
                        })
                    ).build(),
            ).build();
    }

    static logs(data) {
        return create("table")
            .classes("logs")
            .attributes("cellspacing", "0", "cellpadding", "0")
            .children(
                create("thead")
                    .children(
                        create("tr")
                            .classes("log")
                            .children(
                                create("th")
                                    .classes("log-timestamp")
                                    .text("Timestamp")
                                    .build(),
                                create("th")
                                    .classes("log-type")
                                    .text("Type")
                                    .build(),
                                create("th")
                                    .classes("log-scope")
                                    .text("Scope")
                                    .build(),
                                create("th")
                                    .classes("log-message")
                                    .text("Message")
                                    .build(),
                                create("th")
                                    .classes("log-properties")
                                    .text("Properties")
                                    .build(),
                            ).build(),
                    ).build(),
                create("tbody")
                    .children(
                        ...data.map(l => {
                            return create("tr")
                                .classes("log", l.type)
                                .children(
                                    create("td")
                                        .classes("log-timestamp")
                                        .text(Time.ago(l.time))
                                        .build(),
                                    create("td")
                                        .classes("log-type")
                                        .text(l.type)
                                        .build(),
                                    create("td")
                                        .classes("log-scope")
                                        .text(l.scope)
                                        .build(),
                                    create("td")
                                        .classes("log-message", l.type)
                                        .text(l.message)
                                        .build(),
                                    LogTemplates.properties(l.properties),
                                ).build();
                        })
                    ).build(),
            ).build();
    }

    static properties(data) {
        try {
            data = JSON.parse(data);
        } catch (e) {
            // empty
        }

        if (!data) {
            return create("td")
                .classes("log-properties")
                .build();
        }

        const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        return create("td")
            .classes("flex-v", "clickable", "fakeButton", "rounded", "padded-inline")
            .styles("position", "relative")
            .text("Info")
            .onclick(e => {
                if (!e.target?.classList.contains("clickable")) {
                    return;
                }
                document.getElementById("properties-container" + id).classList.toggle("hidden");
            })
            .children(
                create("div")
                    .classes("flex-v", "hidden", "card", "popout-below", "log-properties")
                    .id("properties-container" + id)
                    .children(
                        ...Object.keys(data).map(k => {
                            return LogTemplates.property(k, data[k]);
                        })
                    ).build(),
            ).build();
    }

    static property(key, value) {
        if (value === null) {
            value = "null";
        }

        let valueChild;
        if (typeof value !== "object") {
            valueChild = create("span")
                .classes("property-value")
                .text(value)
                .build();
        } else {
            valueChild = create("details")
                .children(
                    create("summary")
                        .classes("property-value")
                        .text("Object")
                        .build(),
                    create("div")
                        .classes("property-value", "flex-v")
                        .children(
                            ...Object.keys(value).map((k: string) => {
                                return LogTemplates.property(k, value[k]);
                            })
                        ).build()
                ).build();
        }

        return create("div")
            .classes("property", "flex")
            .children(
                create("span")
                    .classes("property-key")
                    .text(key)
                    .build(),
                valueChild
            ).build();
    }

    static logFilters(pillState) {
        const filterMap = {
            all: "All",
            info: "Info",
            warnings: "Warnings",
            errors: "Errors",
        };
        const options = Object.keys(filterMap).map(k => {
            return {
                text: filterMap[k],
                value: k,
                onclick: () => {
                    pillState.value = k;
                }
            };
        });

        return GenericTemplates.pills(options, pillState);
    }
}