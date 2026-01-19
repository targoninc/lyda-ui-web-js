import { compute, create, signal, StringOrSignal } from "@targoninc/jess";
import {DashboardTemplates} from "./DashboardTemplates.ts";
import {Permissions} from "@targoninc/lyda-shared/src/Enums/Permissions";
import {GenericTemplates, vertical} from "../generic/GenericTemplates.ts";
import {t} from "../../../locales";
import {button, heading} from "@targoninc/jess-components";
import {ProgressPart} from "../../Models/ProgressPart.ts";
import {ProgressState} from "@targoninc/lyda-shared/src/Enums/ProgressState";
import {ApiRoutes} from "../../Api/ApiRoutes.ts";

export class ContentIDTemplates {
    static contentIDPage() {
        const progress = signal<ProgressPart | null>(null);
        const logs = signal<StringOrSignal[]>([]);

        const startProcessing = () => {
            progress.value = {
                icon: "sync",
                text: t("STARTING"),
                state: ProgressState.inProgress,
                progress: 0
            };
            logs.value = [`${t("STARTING")}`];

            const eventSource = new EventSource(ApiRoutes.retriggerContentID, {withCredentials: true});

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log("Content ID SSE:", data);

                switch (data.status) {
                    case "reset_complete":
                        progress.value = {
                            ...progress.value!,
                            text: data.message,
                        };
                        logs.value = [...logs.value, data.message];
                        break;
                    case "total":
                        progress.value = {
                            ...progress.value!,
                            text: `${t("TOTAL_TRACKS")}: ${data.count}`,
                            progress: 0
                        };
                        logs.value = [...logs.value, `${t("TOTAL_TRACKS")}: ${data.count}`];
                        break;
                    case "log":
                        logs.value = [...logs.value, data.message];
                        break;
                    case "progress":
                        const percent = (data.processed / data.total) * 100;
                        progress.value = {
                            ...progress.value!,
                            text: t("PROCESSED_N_OF_TOTAL", data.processed, data.total, data.currentTrackId),
                            progress: percent
                        };
                        break;
                    case "error":
                        const errorMsg = t("ERROR_TRACK_ID", data.trackId, data.error);
                        logs.value = [...logs.value, errorMsg];
                        if (data.message) {
                            if (data.message.includes("Skipped")) {
                                logs.value = [...logs.value, t("SKIPPED_MISSING_FILES", data.trackId)];
                            } else {
                                logs.value = [...logs.value, data.message];
                            }
                        }
                        break;
                    case "completed":
                        progress.value = {
                            ...progress.value!,
                            text: data.message,
                            state: ProgressState.complete,
                            progress: 100
                        };
                        logs.value = [...logs.value, data.message];
                        eventSource.close();
                        break;
                    case "critical_error":
                        progress.value = {
                            ...progress.value!,
                            text: data.error,
                            state: ProgressState.error
                        };
                        logs.value = [...logs.value, `${t("CRITICAL_ERROR", data.error)}`];
                        eventSource.close();
                        break;
                }
            };

            eventSource.onerror = (err) => {
                console.error("SSE Error:", err);
                progress.value = {
                    ...progress.value!,
                    text: t("CONNECTION_ERROR"),
                    state: ProgressState.error
                };
                logs.value = [...logs.value, `${t("CONNECTION_ERROR")}`];
                eventSource.close();
            };
        };

        const page = vertical(
            heading({level: 1, text: t("CONTENT_ID_REPROCESSING")}),
            create("p").text(t("CONTENT_ID_REPROCESSING_DESC")),
            button({
                text: t("START_REPROCESSING"),
                onclick: startProcessing,
                disabled: compute((p) => p !== null && p.state === ProgressState.inProgress, progress),
                icon: {icon: "play_arrow"},
                classes: ["positive"]
            }),
            GenericTemplates.progressSectionPart(progress),
            create("div")
                .classes("flex-v", "card", "content-id-logs")
                .children(
                    ...logs.value.map(log => create("div")
                        .text(log)
                        .build())
                )
        ).build();

        // Update logs reactively
        logs.subscribe(l => {
            const logContainer = page.querySelector(".content-id-logs");
            if (logContainer) {
                logContainer.innerHTML = "";
                l.forEach(log => {
                    logContainer.appendChild(create("div").text(log).build());
                });
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        });

        return DashboardTemplates.pageNeedingPermissions([Permissions.canRetriggerContentID], page);
    }
}
