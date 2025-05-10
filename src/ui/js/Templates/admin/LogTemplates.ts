import {Time} from "../../Classes/Helpers/Time.ts";
import {UserTemplates} from "../account/UserTemplates.ts";
import {GenericTemplates} from "../generic/GenericTemplates.ts";
import {copy, Util} from "../../Classes/Util.ts";
import {AnyElement, create, ifjs, signalMap} from "../../../fjsc/src/f2.ts";
import {User} from "../../Models/DbModels/lyda/User.ts";
import {compute, signal, Signal} from "../../../fjsc/src/signals.ts";
import {PillOption} from "../../Models/PillOption.ts";
import {LogLevel} from "../../Enums/LogLevel.ts";
import {Log} from "../../Models/DbModels/lyda/Log.ts";
import {FJSC} from "../../../fjsc";
import {LydaApi} from "../../Api/LydaApi.ts";
import {truncateText} from "../../Classes/Helpers/CustomText.ts";
import {DashboardTemplates} from "./DashboardTemplates.ts";
import {Permissions} from "../../Enums/Permissions.ts";
import {notify} from "../../Classes/Ui.ts";
import {NotificationType} from "../../Enums/NotificationType.ts";
import {permissions} from "../../state.ts";
import {Api} from "../../Api/Api.ts";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";

export class LogTemplates {
    static actionLogsPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canViewActionLogs],
            LogTemplates.actionLogsView()
        );
    }

    static actionLogsView() {
        const actionLogs = signal<any[]>([]);
        Api.getAsync<any[]>(ApiRoutes.getActionLogs).then(res => {
            if (res.code === 200) {
                actionLogs.value = res.data;
            }
        });

        return LogTemplates.actionLogs(actionLogs);
    }

    static actionLogs(logs: Signal<any[]>) {
        return create("table")
            .classes("logs")
            .attributes("cellspacing", "0", "cellpadding", "0")
            .children(
                LogTemplates.logsTableHeader(),
                signalMap(logs, create("tbody"), l => LogTemplates.actionLogEntry(l)),
            ).build();
    }

    private static actionLogEntry(l: any) {
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
                        UserTemplates.userWidget(l.user, Util.userIsFollowing(l.user)),
                    ).build(),
                create("td")
                    .classes("log-action-name")
                    .text(l.actionName)
                    .build(),
                create("td")
                    .classes("log-user")
                    .children(
                        UserTemplates.userWidget(l.actioned_user, Util.userIsFollowing(l.actioned_user)),
                    ).build(),
                LogTemplates.properties(l.additional_info),
            ).build();
    }

    private static logsTableHeader() {
        return create("thead")
            .children(
                create("tr")
                    .classes("log")
                    .children(
                        GenericTemplates.tableHeader("Timestamp", "log-timestamp"),
                        GenericTemplates.tableHeader("User", "log-user"),
                        GenericTemplates.tableHeader("Action Name", "log-action-name"),
                        GenericTemplates.tableHeader("Actioned User", "log-user"),
                        GenericTemplates.tableHeader("Properties", "log-properties"),
                    ).build(),
            ).build();
    }

    static logs(data: Log[]) {
        const headers = ["Timestamp", "Host", "Log Level", "Message", "Stack", "Properties"];
        const headerDefinitions = headers.map(h => ({
            title: h,
            className: h.toLowerCase().replaceAll(" ", "-"),
        }));
        const logLevelMap: Record<number, string> = {
            [LogLevel.debug]: "Debug",
            [LogLevel.success]: "Success",
            [LogLevel.info]: "Info",
            [LogLevel.warning]: "Warning",
            [LogLevel.error]: "Error",
            [LogLevel.critical]: "Critical",
            [LogLevel.unknown]: "Unknown",
        };

        return GenericTemplates.tableBody(
            GenericTemplates.tableHeaders(headerDefinitions),
            create("tbody")
                .children(
                    ...data.map(l => LogTemplates.logEntry(logLevelMap, l))
                ).build(),
        );
    }

    private static logEntry(logLevelMap: Record<number, string>, l: Log) {
        const type = logLevelMap[l.logLevel].toLowerCase();
        const ago = Time.agoUpdating(new Date(l.time), true);
        const timestamp = compute(t => Time.toTimeString(l.time) + " | " + t, ago);

        return create("tr")
            .classes("log", type)
            .children(
                create("td")
                    .classes("log-timestamp")
                    .text(timestamp)
                    .build(),
                create("td")
                    .classes("log-host", "color-dim")
                    .text(l.host)
                    .build(),
                create("td")
                    .classes("log-level")
                    .text(logLevelMap[l.logLevel])
                    .build(),
                create("td")
                    .classes("log-message", type, "color-dim", "text-small")
                    .title(l.message)
                    .text(truncateText(l.message, 200))
                    .onclick(() => copy(l.message))
                    .build(),
                create("td")
                    .classes("log-stack")
                    .children(
                        FJSC.button({
                            text: "Copy stack",
                            icon: {icon: "content_copy"},
                            onclick: () => copy(l.stack)
                        }),
                    ).build(),
                LogTemplates.properties(l.properties),
            ).build();
    }

    static properties(data: any) {
        if (Object.keys(data).length === 0) {
            return create("td")
                .classes("log-properties")
                .build();
        }
        const shown = signal(false);

        return create("td")
            .classes("flex-v")
            .styles("position", "relative")
            .children(
                FJSC.button({
                    text: "Info",
                    icon: { icon: "info" },
                    onclick: () => {
                        shown.value = !shown.value;
                    }
                }),
                ifjs(shown, create("div")
                    .classes("flex-v", "card", "popout-below", "log-properties")
                    .children(
                        ...Object.keys(data).map(k => {
                            return LogTemplates.property(k, data[k]);
                        })
                    ).build()),
            ).build();
    }

    static signalProperty(key: string, value: Signal<any>): AnyElement {
        const el = create("div")
            .children(
                LogTemplates.property(key, value.value)
            ).build();
        value.subscribe(v => {
            el.innerHTML = "";
            el.appendChild(LogTemplates.property(key, v));
        });

        return el;
    }

    static property(key: string, value: any): AnyElement {
        if (value === null) {
            value = "null";
        }

        let valueChild, showKey = true;
        if (typeof value !== "object") {
            valueChild = create("span")
                .classes("property-value")
                .text(value)
                .build();
        } else {
            showKey = false;
            valueChild = create("details")
                .children(
                    create("summary")
                        .classes("property-value")
                        .text(key)
                        .build(),
                    create("div")
                        .classes("property-value", "flex-v")
                        .children(
                            ...Object.keys(value).map((k: string) => {
                                return LogTemplates.property(k, value[k]) as any;
                            })
                        ).build()
                ).build();
        }

        return create("div")
            .classes("property", "flex")
            .children(
                showKey ? create("span")
                    .classes("property-key")
                    .text(key)
                    .build() : null,
                valueChild
            ).build();
    }

    static logsPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canViewLogs],
            LogTemplates.logsView()
        )
    }

    static logsView() {
        const filterState = signal(LogLevel.debug);
        const refreshOnInterval = signal(false);
        const logs = signal<Log[]>([]);
        const refresh = () => {
            LydaApi.getLogs(filterState, async (newLogs: Log[]) => {
                logs.value = newLogs;
            });
        };
        setInterval(() => {
            if (refreshOnInterval.value) {
                refresh();
            }
        }, 1000 * 5);
        refresh();

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "align-children", "fixed-bar")
                    .children(
                        LogTemplates.logFilters(filterState),
                        FJSC.button({
                            text: "Refresh",
                            icon: { icon: "refresh" },
                            classes: ["positive"],
                            onclick: async () => {
                                logs.value = [];
                                refresh();
                            }
                        }),
                        FJSC.toggle({
                            text: "Auto-refresh",
                            id: "auto-refresh",
                            checked: refreshOnInterval,
                            onchange: (v) => {
                                refreshOnInterval.value = v;
                            }
                        }),
                    ).build(),
                compute(l => LogTemplates.logs(l), logs)
            ).build();
    }

    static logFilters(pillState: Signal<LogLevel>) {
        const filterMap: Record<string, Partial<PillOption>> = {
            debug: {
                text: "Debug",
                icon: "bug_report",
                value: LogLevel.debug
            },
            success: {
                text: "Success",
                icon: "check",
                value: LogLevel.success
            },
            info: {
                text: "Info",
                icon: "info",
                value: LogLevel.info
            },
            warnings: {
                text: "Warnings",
                icon: "warning",
                value: LogLevel.warning
            },
            errors: {
                text: "Errors",
                icon: "report",
                value: LogLevel.error
            },
        };
        const options = Object.keys(filterMap).map(k => {
            return {
                ...filterMap[k],
                onclick: () => {
                    pillState.value = filterMap[k].value;
                }
            };
        }) as PillOption[];

        return GenericTemplates.pills(options, pillState);
    }
}