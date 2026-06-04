import { compute, create, InputType, signal, Signal, signalMap, when } from "@targoninc/jess";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { DashboardTemplates } from "./DashboardTemplates.ts";
import { button, input } from "@targoninc/jess-components";
import { Api } from "../../Api/Api.ts";
import { t } from "../../../locales";
import { GenericTemplates, horizontal, vertical } from "../generic/GenericTemplates.ts";
import { Ui } from "../../Classes/Ui.ts";
import { TextSize } from "../../Enums/TextSize.ts";

export class IpLogTemplates {
    static ipLogsPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canReadIpLogs],
            IpLogTemplates.ipLogsList(),
        );
    }

    static ipLogsList() {
        const logs = signal<any[]>([]);
        const bannedIps = signal<any[]>([]);
        const query = signal<string>("");
        const ipFilter = signal<string>("");
        const skip = signal<number>(0);
        const loading = signal(false);

        const refreshLogs = async () => {
            loading.value = true;
            try {
                const result = await Api.getIpLogs(skip.value, 20, query.value, ipFilter.value);
                logs.value = result?.items ?? [];
            } finally {
                loading.value = false;
            }
        };

        const refresh = async () => {
            await Promise.all([
                refreshLogs(),
                Api.getBannedIps().then(r => { bannedIps.value = r ?? []; }),
            ]);
        };

        refresh().then();

        return create("div")
            .children(
                create("div")
                    .classes("flex", "align-children", "fixed-bar")
                    .children(
                        button({
                            text: t("REFRESH"),
                            icon: { icon: "refresh" },
                            classes: ["positive"],
                            onclick: async () => {
                                logs.value = [];
                                await refresh();
                            },
                        }),
                        input<string>({
                            type: InputType.text,
                            name: "search",
                            placeholder: t("FILTER"),
                            value: query,
                            debounce: 200,
                            onchange: async (v: string) => {
                                if (v !== query.value) {
                                    query.value = v;
                                    skip.value = 0;
                                    await refreshLogs();
                                }
                            },
                        }),
                        input<string>({
                            type: InputType.text,
                            name: "ip-filter",
                            placeholder: "Filter by IP",
                            value: ipFilter,
                            debounce: 200,
                            onchange: async (v: string) => {
                                if (v !== ipFilter.value) {
                                    ipFilter.value = v;
                                    skip.value = 0;
                                    await refreshLogs();
                                }
                            },
                        }),
                        button({
                            text: t("PREVIOUS_PAGE"),
                            icon: { icon: "skip_previous" },
                            disabled: compute((l, s) => l || s <= 0, loading, skip),
                            onclick: async () => {
                                skip.value = Math.max(0, skip.value - 20);
                                await refreshLogs();
                            },
                        }),
                        button({
                            text: t("NEXT_PAGE"),
                            icon: { icon: "skip_next" },
                            disabled: compute((l, e) => l || e.length < 20, loading, logs),
                            onclick: async () => {
                                skip.value = skip.value + 20;
                                await refreshLogs();
                            },
                        }),
                        when(loading, GenericTemplates.loadingSpinner()),
                    ).build(),
                signalMap(
                    bannedIps,
                    create("div").classes("flex-v", "small-gap", "padded"),
                    ip => IpLogTemplates.bannedIpEntry(ip, bannedIps),
                ),
                signalMap(
                    logs,
                    vertical().classes("fixed-bar-content"),
                    log => IpLogTemplates.ipLogEntry(log),
                ),
            ).build();
    }

    private static bannedIpEntry(ip: any, bannedIps: Signal<any[]>) {
        return create("div")
            .classes("flex", "align-children", "small-gap")
            .children(
                create("span").classes("text", "color-negative").text(`Banned: ${ip.ip}`).build(),
                create("span").classes(TextSize.xSmall).text(ip.reason ? `(${ip.reason})` : "").build(),
                button({
                    text: "Unban",
                    classes: ["small"],
                    onclick: async () => {
                        bannedIps.value = (await Api.getBannedIps()) ?? [];
                    },
                }),
            ).build();
    }

    private static ipLogEntry(log: any) {
        return create("details")
            .children(
                create("summary").children(
                    horizontal(
                        create("span").classes("text", "code").text(log.ip).build(),
                        create("span").classes(TextSize.xSmall).text(log.method).build(),
                        create("span").classes(TextSize.xSmall).text(log.path).build(),
                        create("span").classes(TextSize.xSmall).text(new Date(log.created_at).toLocaleString()).build(),
                        when(log.rate_limited, create("span").classes("color-negative").text("RATE LIMITED").build()),
                    ).classes("fullWidth", "space-between", "align-children"),
                ).build(),
                vertical(
                    create("div").text(`User Agent: ${log.user_agent}`).build(),
                    create("div").text(`User ID: ${log.user_id ?? "anonymous"}`).build(),
                    horizontal(
                        button({
                            text: "Ban IP",
                            icon: { icon: "block" },
                            classes: ["negative", "small"],
                            onclick: async () => {
                                await Ui.getConfirmationModal(
                                    "Ban IP",
                                    `Are you sure you want to ban IP ${log.ip}?`,
                                    "Ban",
                                    "Cancel",
                                    async () => {
                                        await Api.banIp(log.ip);
                                    },
                                    async () => {},
                                );
                            },
                        }),
                    ).classes("small-gap"),
                ).classes("card", "padded"),
            ).build();
    }
}
