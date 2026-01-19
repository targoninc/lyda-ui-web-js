import { compute, create, signal, StringOrSignal } from "@targoninc/jess";
import {DashboardTemplates} from "./DashboardTemplates.ts";
import {Permissions} from "@targoninc/lyda-shared/src/Enums/Permissions";
import {GenericTemplates, vertical} from "../generic/GenericTemplates.ts";
import {t} from "../../../locales";
import {button, heading} from "@targoninc/jess-components";
import {ProgressPart} from "../../Models/ProgressPart.ts";
import {ProgressState} from "@targoninc/lyda-shared/src/Enums/ProgressState";
import { Api } from "../../Api/Api.ts";
import { eventBus } from "../../Classes/EventBus.ts";

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
                        logs.value = [...logs.value, event.message];
                        break;
                    case "total_tracks":
                        progress.value = {
                            ...progress.value!,
                            text: `${t("TOTAL_TRACKS")}: ${event.count}`,
                            progress: 0
                        };
                        logs.value = [...logs.value, `${t("TOTAL_TRACKS")}: ${event.count}`];
                        break;
                    case "log":
                        logs.value = [...logs.value, event.message];
                        break;
                    case "progress":
                        const percent = (event.processed / event.total) * 100;
                        progress.value = {
                            ...progress.value!,
                            text: t("PROCESSED_N_OF_TOTAL", event.processed, event.total, event.currentTrackId),
                            progress: percent
                        };
                        break;
                    case "error":
                        const errorMsg = t("ERROR_TRACK_ID", event.trackId, event.error);
                        logs.value = [...logs.value, errorMsg];
                        if (event.message) {
                            if (event.message.includes("Skipped")) {
                                logs.value = [...logs.value, t("SKIPPED_MISSING_FILES", event.trackId)];
                            } else {
                                logs.value = [...logs.value, event.message];
                            }
                        }
                        break;
                    case "completed":
                        progress.value = {
                            ...progress.value!,
                            text: event.message,
                            state: ProgressState.complete,
                            progress: 100
                        };
                        logs.value = [...logs.value, event.message];
                        subscription.unsubscribe();
                        break;
                    case "critical_error":
                        progress.value = {
                            ...progress.value!,
                            text: event.error,
                            state: ProgressState.error
                        };
                        logs.value = [...logs.value, `${t("CRITICAL_ERROR", event.error)}`];
                        subscription.unsubscribe();
                        break;
                }
            });
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
