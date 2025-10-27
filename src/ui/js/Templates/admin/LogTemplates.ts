import { Time } from "../../Classes/Helpers/Time.ts";
import { UserTemplates } from "../account/UserTemplates.ts";
import { GenericTemplates, text, vertical } from "../generic/GenericTemplates.ts";
import { copy } from "../../Classes/Util.ts";
import {
    AnyElement,
    compute,
    create,
    nullElement,
    signal,
    Signal,
    signalMap,
    StringOrSignal,
    when,
} from "@targoninc/jess";
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
import { TableTemplates } from "../generic/TableTemplates.ts";

export class LogTemplates {
    static actionLogsPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canViewActionLogs],
            LogTemplates.actionLogsView(),
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

        return TableTemplates.table(
            false,
            TableTemplates.tableHeaders<ActionLog>([
                { title: t("TIMESTAMP"), property: "created_at" },
                { title: t("USER"), property: "user_id" },
                { title: t("ACTION_NAME"), property: "action_name" },
                { title: t("ACTIONED_USER"), property: "actioned_user_id" },
                { title: t("PROPERTIES"), property: "additional_info" },
            ], currentSortProperty),
            signalMap(sorted, create("tbody"), l => LogTemplates.actionLogEntry(l)),
        );
    }

    private static actionLogEntry(l: any) {
        return TableTemplates.tr({
            classes: ["log", l.type],
            cellClasses: [
                "log-timestamp",
                "log-user",
                "log-action-name",
                "log-user",
                "log-properties-cell",
            ],
            data: [
                create("span").text(Time.ago(l.createdAt)),
                UserTemplates.userWidget(l.user),
                create("span").text(l.actionName),
                UserTemplates.userWidget(l.actioned_user),
                LogTemplates.properties(l.additional_info),
            ],
        });
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

        return TableTemplates.table(
            true,
            TableTemplates.tableHeaders(headers, sortBy$),
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

        return TableTemplates.tr({
            classes: ["log", type],
            cellClasses: [
                "log-timestamp",
                ["log-host", "color-dim"],
                "log-level",
                ["log-message", type, "color-dim", "text-small"],
                "log-stack",
            ],
            data: [
                text(timestamp),
                text(l.host),
                text(logLevelMap[l.logLevel].at(0)),
                text(truncateText(l.message, 200)),
                button({
                    text: t("COPY_STACK"),
                    icon: { icon: "content_copy" },
                    onclick: () => copy(l.stack),
                }),
                LogTemplates.properties(l.properties),
            ],
        });
    }

    static properties(data: any) {
        if (Object.keys(data).length === 0) {
            return nullElement();
        }
        const shown = signal(false);

        return vertical(
            button({
                text: t("INFO"),
                icon: { icon: "info" },
                onclick: () => {
                    shown.value = !shown.value;
                },
            }),
            when(shown, create("div")
                .classes("flex-v", "card", "popout-below", "log-properties")
                .children(
                    ...Object.keys(data).map(k => {
                        return LogTemplates.property(k, data[k]);
                    }),
                ).build(),
            ),
        ).styles("position", "relative")
         .build();
    }

    static signalProperty(key: string, value: Signal<any>): Signal<HTMLElement | SVGElement> {
        return compute(v => LogTemplates.property(key, v), value);
    }

    static property(key: StringOrSignal, value: any): AnyElement {
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
                            }),
                        ).build(),
                ).build();
        }

        return create("div")
            .classes("property", "flex")
            .children(
                showKey ? create("span")
                    .classes("property-key")
                    .text(key)
                    .build() : null,
                valueChild,
            ).build();
    }

    static logsPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canViewLogs],
            LogTemplates.logsView(),
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
                            },
                        }),
                        toggle({
                            text: t("AUTO_REFRESH"),
                            id: "auto-refresh",
                            checked: refreshOnInterval,
                            onchange: (v) => {
                                refreshOnInterval.value = v;
                            },
                        }),
                    ).build(),
                compute(l => LogTemplates.logs(l), logs),
            ).build();
    }

    static logFilters(pillState: Signal<LogLevel>) {
        const filterMap: Record<string, Partial<PillOption>> = {
            debug: {
                text: t("DEBUG"),
                icon: "bug_report",
                value: LogLevel.debug,
            },
            success: {
                text: t("SUCCESS"),
                icon: "check",
                value: LogLevel.success,
            },
            info: {
                text: t("INFO"),
                icon: "info",
                value: LogLevel.info,
            },
            warnings: {
                text: t("WARNING"),
                icon: "warning",
                value: LogLevel.warning,
            },
            errors: {
                text: t("ERROR"),
                icon: "report",
                value: LogLevel.error,
            },
        };
        const options = Object.keys(filterMap).map(k => {
            return {
                ...filterMap[k],
                onclick: () => {
                    pillState.value = filterMap[k].value;
                },
            };
        }) as PillOption[];

        return GenericTemplates.pills(options, pillState);
    }
}