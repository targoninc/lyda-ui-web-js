import {compute, create, signal, signalMap, StringOrSignal, when} from "@targoninc/jess";
import {DashboardTemplates} from "./DashboardTemplates.ts";
import {Permissions} from "@targoninc/lyda-shared/src/Enums/Permissions";
import {GenericTemplates, horizontal, vertical} from "../generic/GenericTemplates.ts";
import {t} from "../../../locales";
import {button, heading, text, toggle} from "@targoninc/jess-components";
import {ProgressPart} from "../../Models/ProgressPart.ts";
import {ProgressState} from "@targoninc/lyda-shared/src/Enums/ProgressState";
import {Api} from "../../Api/Api.ts";
import {eventBus} from "../../Classes/EventBus.ts";
import {ContentIDMatch} from "../../Models/ContentIDMatch.ts";
import {MusicTemplates} from "../music/MusicTemplates.ts";
import {EntityType} from "@targoninc/lyda-shared/src/Enums/EntityType.ts";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";

interface LogEvent {
    type: "success" | "error" | "info" | "debug";
    message: StringOrSignal;
    time: Date;
}

const progress = signal<ProgressPart | null>(null);
const logs = signal<LogEvent[]>([]);
const includeDebug = signal(false);
const filteredLogs = compute((l, i): LogEvent[] => l.filter(e => e.type !== "debug" || i), logs, includeDebug);
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

filteredLogs.subscribe(l => {
    const logContainer = document.querySelector(".content-id-logs");
    if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
    }
});

export class ContentIDTemplates {
    static contentIDPage() {
        return DashboardTemplates.pageNeedingPermissions(
            [Permissions.canRetriggerContentID],
            vertical(
                heading({
                    level: 1,
                    text: t("CONTENT_ID_REPROCESSING")
                }),
                create("p")
                    .text(t("CONTENT_ID_REPROCESSING_DESC")),
                horizontal(
                    horizontal(
                        when(inProgress, button({
                            text: t("START_REPROCESSING"),
                            onclick: startProcessing,
                            icon: {icon: "play_arrow"},
                            classes: ["positive"],
                        }), true),
                        when(inProgress, button({
                            text: t("CANCEL"),
                            onclick: () => {
                                eventBus.send({type: "content_id:stop_requested"});
                            },
                            icon: {icon: "cancel"},
                            classes: ["negative"],
                        })),
                        GenericTemplates.progressSectionPart(progress),
                    ),
                    toggle({
                        checked: includeDebug,
                        validators: [],
                        text: t("DEBUG"),
                        onchange: () => includeDebug.value = !includeDebug.value
                    }),
                ).classes("space-between"),
                signalMap(filteredLogs, vertical().classes("border", "card", "secondary", "content-id-logs"),
                    log => {
                        return create("div")
                            .classes("log", log.type)
                            .text(`[${log.time?.toISOString() ?? new Date().toISOString()}]\t${log.message}`)
                            .title(log.time.toLocaleString())
                            .build();
                    }),
                ContentIDTemplates.matchesList()
            ).build()
        );
    }

    static matchesList() {
        const matches = signal<ContentIDMatch[]>([]);
        const loading = signal(false);
        const getMatches = () => {
            loading.value = true;
            Api.getContentIDMatches().then(m => {
                matches.value = m ?? [];
            }).finally(() => loading.value = false);
        }

        return vertical(
            horizontal(
                button({
                    onclick: getMatches,
                    icon: {icon: "play_arrow"},
                    classes: ["positive"],
                    disabled: loading,
                    text: "Get matches"
                }),
            ),
            signalMap(matches, vertical().classes("gap"),
                match => {
                    const matchedTracks = match.matches.reduce((prev, cur) => {
                        if (!prev.find(t => t.id === cur.track.id)) {
                            prev.push(cur.track);
                        }

                        const track = prev.find(t => t.id === cur.track.id);
                        track!.matches ??= [];
                        track!.matches.push(cur);

                        return prev;
                    }, [] as TrackWithMatches[]);

                    return create("details").children(
                        create("summary").children(
                            horizontal(
                                MusicTemplates.cover(EntityType.track, match.track, "inline-cover"),
                                MusicTemplates.title(EntityType.track, match.track.title, match.track.id),
                                text({
                                    tag: "span",
                                    text: `(${match.matches.length} matches)`,
                                    classes: ["color-dim", "text-small"]
                                }),
                            ).classes("align-children", "small-gap").build()
                        ),
                        vertical(
                            ...matchedTracks.map(m => {
                                return create("div").classes("content-id-matches-grid", "padded-small").children(
                                    create("div").classes("content-id-match-part", "card", "secondary").children(
                                        horizontal(
                                            MusicTemplates.cover(EntityType.track, m, "inline-cover"),
                                            MusicTemplates.title(EntityType.track, m.title, m.id),
                                        )
                                    ),
                                    create("div").classes("content-id-match-part", "center", "card").children(
                                        vertical(
                                            ...m.matches!.map(mm => {
                                                const percent = (mm.similarity * 100).toFixed(1);

                                                return horizontal(
                                                    create("div").classes("progress-circle").styles(
                                                        "background",
                                                        `conic-gradient(var(--progress-color) ${percent}%, transparent 0%)`,
                                                    ).children(create("div").classes("progress-circle-overlay")).build(),
                                                    heading({
                                                        level: 2,
                                                        text: `${percent}%`
                                                    }),
                                                    heading({
                                                        level: 2,
                                                        text: mm.heuristic
                                                    }),
                                                )
                                            })
                                        ),
                                    ),
                                ).build();
                            })
                        ).classes("gap").build()
                    ).build();
                }),
        )
    }
}

interface TrackWithMatches extends Track {
    matches?: {
        similarity: number;
        heuristic: string;
    }[];
}