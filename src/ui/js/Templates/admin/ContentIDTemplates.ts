import {compute, create, signal, signalMap, StringOrSignal, when} from "@targoninc/jess";
import { DashboardTemplates } from "./DashboardTemplates.ts";
import { Permissions } from "@targoninc/lyda-shared/src/Enums/Permissions";
import { GenericTemplates, vertical } from "../generic/GenericTemplates.ts";
import { t } from "../../../locales";
import { button, heading } from "@targoninc/jess-components";
import { ProgressPart } from "../../Models/ProgressPart.ts";
import { ProgressState } from "@targoninc/lyda-shared/src/Enums/ProgressState";
import { Api } from "../../Api/Api.ts";
import { eventBus } from "../../Classes/EventBus.ts";

interface LogEvent {
    type: "success" | "error" | "info";
    message: StringOrSignal;
    time: Date;
}

export class ContentIDTemplates {
    static contentIDPage() {
        const progress = signal<ProgressPart | null>(null);
        const logs = signal<LogEvent[]>([]);
        const inProgress = compute((p) => p !== null && p.state === ProgressState.inProgress, progress);

        const startProcessing = () => {
            progress.value = {
                icon: "sync",
                text: t("STARTING"),
                state: ProgressState.inProgress,
                progress: 0,
            };
            logs.value = [{
                time: new Date(),
                message: t("STARTING"),
                type: "info",
            }];

            Api.retriggerContentID().then();

            const subscription = eventBus.subscribe("content_id", (data) => {
                console.log("Content ID WebSocket Event:", data);
                const event = data.payload;

                switch (data.type.split("content_id:").at(1)) {
                    case "reset_complete":
                        progress.value = {
                            ...progress.value!,
                            text: event.message,
                        };
                        logs.value = [...logs.value, {
                            message: event.message,
                            time: new Date(),
                            type: "info",
                        }];
                        break;
                    case "total_tracks":
                        progress.value = {
                            ...progress.value!,
                            text: `${t("TOTAL_TRACKS")}: ${event.count}`,
                            progress: 0,
                        };
                        logs.value = [
                            ...logs.value,
                            {
                                time: new Date(),
                                message: `${t("TOTAL_TRACKS")}: ${event.count}`,
                                type: "info",
                            },
                        ];
                        break;
                    case "log":
                        logs.value = [
                            ...logs.value,
                            {
                                time: new Date(),
                                message: event.message,
                                type: "info",
                            },
                        ];
                        break;
                    case "progress":
                        const percent = (event.processed / event.total) * 100;
                        progress.value = {
                            ...progress.value!,
                            text: t("PROCESSED_N_OF_TOTAL", event.processed, event.total, event.currentTrackId),
                            progress: percent,
                        };
                        break;
                    case "error":
                        if (event.error) {
                            logs.value = [
                                ...logs.value,
                                {
                                    time: new Date(),
                                    message: `Error with track ${event.trackId}: ${event.error}`,
                                    type: "error",
                                },
                            ];
                        }
                        break;
                    case "completed":
                        progress.value = {
                            ...progress.value!,
                            text: event.message,
                            state: ProgressState.complete,
                            progress: 100,
                        };
                        logs.value = [
                            ...logs.value,
                            {
                                time: new Date(),
                                message: event.message,
                                type: "success",
                            },
                        ];
                        subscription.unsubscribe();
                        break;
                    case "critical_error":
                        progress.value = {
                            ...progress.value!,
                            text: event.error,
                            state: ProgressState.error,
                        };
                        logs.value = [
                            ...logs.value,
                            {
                                time: new Date(),
                                message: `${t("CRITICAL_ERROR", event.error)}`,
                                type: "error",
                            },
                        ];
                        subscription.unsubscribe();
                        break;
                }
            });
        };

        const page = vertical(
            heading({
                level: 1,
                text: t("CONTENT_ID_REPROCESSING")
            }),
            create("p")
                .text(t("CONTENT_ID_REPROCESSING_DESC")),
            when(inProgress, button({
                text: t("START_REPROCESSING"),
                onclick: startProcessing,
                icon: { icon: "play_arrow" },
                classes: ["positive"],
            }), true),
            when(inProgress, button({
                text: t("CANCEL"),
                onclick: () => {
                    eventBus.send({ type: "content_id:stop_requested" });
                },
                icon: { icon: "cancel" },
                classes: ["negative"],
            })),
            GenericTemplates.progressSectionPart(progress),
            signalMap(logs, vertical().classes("flex-v", "border", "card", "secondary", "content-id-logs"),
                log => {
                    return create("div")
                        .classes("log", log.type)
                        .text(`[${log.time?.toISOString() ?? new Date().toISOString()}]\t${log.message}`)
                        .title(log.time.toLocaleString())
                        .build();
                }),
        ).build();

        // Update logs reactively
        logs.subscribe(l => {
            const logContainer = page.querySelector(".content-id-logs");
            if (logContainer) {
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        });

        return DashboardTemplates.pageNeedingPermissions([Permissions.canRetriggerContentID], page);
    }
}
