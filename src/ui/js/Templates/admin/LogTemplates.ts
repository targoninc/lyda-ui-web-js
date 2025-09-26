import { Time } from "../../Classes/Helpers/Time.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { GenericTemplates } from "../generic/GenericTemplates.ts";
import { copy } from "../../Classes/Util.ts";
import { AnyElement, compute, create, signal, Signal, signalMap, StringOrSignal, when } from "@targoninc/jess";
import { Api } from "../../Api/Api.ts";
import { truncateText } from "../../Classes/Helpers/CustomText.ts";
import { DashboardTemplates } from "./DashboardTemplates.ts";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { button, toggle } from "@targoninc/jess-components";
import { Log } from "@targoninc/lyda-shared/src/Models/db/lyda/Log";
import { LogLevel } from "@targoninc/lyda-shared/src/Enums/LogLevel";
import { PillOption } from "../../Models/PillOption.ts";
import { ActionLog } from "@targoninc/lyda-shared/dist/Models/db/lyda/ActionLog";
import { t } from "../../../locales";
import { sortByProperty } from "../../Classes/Helpers/Sorting.ts";

export class LogTemplates {
    static actionLogsPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canViewActionLogs],
            LogTemplates.actionLogsView()
        );
    }

    static actionLogsView() {
        const actionLogs = signal<ActionLog[]>([]);
        Api.getActionLogs().then(res => {
            if (res) {
                actionLogs.value = res;
            }
        });

        return LogTemplates.actionLogs(actionLogs);
    }

    static actionLogs(logs: Signal<ActionLog[]>) {
        const currentSortProperty = signal<keyof ActionLog | null>(null);
        const sorted = compute((l, c) => {
            return sortByProperty(c, l);
        }, logs, currentSortProperty);

        return create("table")
            .classes("logs")
            .attributes("cellspacing", "0", "cellpadding", "0")
            .children(
                LogTemplates.actionLogsTableHeader(currentSortProperty),
                signalMap(sorted, create("tbody"), l => LogTemplates.actionLogEntry(l)),
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
                        UserTemplates.userWidget(l.user),
                    ).build(),
                create("td")
                    .classes("log-action-name")
                    .text(l.actionName)
                    .build(),
                create("td")
                    .classes("log-user")
                    .children(
                        UserTemplates.userWidget(l.actioned_user),
                    ).build(),
                LogTemplates.properties(l.additional_info),
            ).build();
    }

    private static actionLogsTableHeader(currentSortHeader: Signal<keyof ActionLog | null>) {
        return create("thead")
            .children(
                create("tr")
                    .classes("log")
                    .children(
                        GenericTemplates.tableHeader<ActionLog>("Timestamp", "created_at", currentSortHeader),
                        GenericTemplates.tableHeader<ActionLog>("User", "user_id", currentSortHeader),
                        GenericTemplates.tableHeader<ActionLog>("Action Name", "action_name", currentSortHeader),
                        GenericTemplates.tableHeader<ActionLog>("Actioned User", "actioned_user_id", currentSortHeader),
                        GenericTemplates.tableHeader<ActionLog>("Properties", "additional_info", currentSortHeader),
                    ).build(),
            ).build();
    }

    static logs(data: Log[]) {
        const headers: { title: StringOrSignal, property: keyof Log }[] = [
            {
                title: t("TIMESTAMP"),
                property: "time",
            },
            {
                title: t("HOST"),
                property: "host",
            },
            {
                title: t("LOG_LEVEL"),
                property: "logLevel",
            },
            {
                title: t("MESSAGE"),
                property: "message",
            },
            {
                title: t("STACK"),
                property: "stack",
            },
            {
                title: t("PROPERTIES"),
                property: "properties",
            },
        ];
        const logLevelMap: Record<number, [StringOrSignal, string]> = {
            [LogLevel.debug]: [t("DEBUG"), "debug"],
            [LogLevel.success]: [t("SUCCESS"), "success"],
            [LogLevel.info]: [t("INFO"), "info"],
            [LogLevel.warning]: [t("WARNING"), "warning"],
            [LogLevel.error]: [t("ERROR"), "error"],
            [LogLevel.critical]: [t("CRITICAL"), "critical"],
            [LogLevel.unknown]: [t("UNKNOWN"), "unknown"],
        };
        const logs = signal(data);
        const sortBy$ = signal<keyof Log | null>("time");
        const filtered = compute(sortByProperty, sortBy$, logs);

        return GenericTemplates.tableBody(
            GenericTemplates.tableHeaders(headers, sortBy$),
            signalMap(
                filtered,
                create("tbody"),
                l => LogTemplates.logEntry(logLevelMap, l),
            ),
        );
    }

    private static logEntry(logLevelMap: Record<number, [StringOrSignal, string]>, l: Log) {
        const type = logLevelMap[l.logLevel][1];
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
                    .text(logLevelMap[l.logLevel][0])
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
                        button({
                            text: t("COPY_STACK"),
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
                button({
                    text: t("INFO"),
                    icon: { icon: "info" },
                    onclick: () => {
                        shown.value = !shown.value;
                    }
                }),
                when(shown, create("div")
                    .classes("flex-v", "card", "popout-below", "log-properties")
                    .children(
                        ...Object.keys(data).map(k => {
                            return LogTemplates.property(k, data[k]);
                        })
                    ).build()),
            ).build();
    }

    static signalProperty(key: string, value: Signal<any>): Signal<HTMLElement | SVGElement> {
        return compute(v => LogTemplates.property(key, v), value);
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
        );
    }

    static logsView() {
        const filterState = signal(LogLevel.debug);
        const refreshOnInterval = signal(false);
        const logs = signal<Log[]>([]);
        const loading = signal(false);
        const refresh = async () => {
            loading.value = true;
            logs.value = await Api.getLogs(filterState.value);
            loading.value = false;
        };
        filterState.subscribe(refresh);
        setInterval(() => {
            if (refreshOnInterval.value && !loading.value) {
                refresh().then();
            }
        }, 1000 * 5);
        refresh().then();

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "align-children", "fixed-bar")
                    .children(
                        LogTemplates.logFilters(filterState),
                        button({
                            text: t("REFRESH"),
                            icon: { icon: "refresh" },
                            classes: ["positive"],
                            onclick: async () => {
                                logs.value = [];
                                refresh().then();
                            }
                        }),
                        toggle({
                            text: t("AUTO_REFRESH"),
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
                text: t("DEBUG"),
                icon: "bug_report",
                value: LogLevel.debug
            },
            success: {
                text: t("SUCCESS"),
                icon: "check",
                value: LogLevel.success
            },
            info: {
                text: t("INFO"),
                icon: "info",
                value: LogLevel.info
            },
            warnings: {
                text: t("WARNING"),
                icon: "warning",
                value: LogLevel.warning
            },
            errors: {
                text: t("ERROR"),
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