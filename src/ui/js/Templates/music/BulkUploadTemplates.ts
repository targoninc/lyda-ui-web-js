import {compute, create, InputType, nullElement, signal, Signal, when} from "@targoninc/jess";
import {button} from "@targoninc/jess-components";
import {Api} from "../../Api/Api.ts";
import {MediaUploader} from "../../Api/MediaUploader.ts";
import {NotificationType} from "../../Enums/NotificationType.ts";
import {TextSize} from "../../Enums/TextSize.ts";
import {GenericTemplates} from "../generic/GenericTemplates.ts";
import {navigate} from "../../Routing/Router.ts";
import {RoutePath} from "../../Routing/routes.ts";
import {notify} from "../../Classes/Ui.ts";
import {t} from "../../../locales";
import {MediaFileType} from "@targoninc/lyda-shared/src/Enums/MediaFileType";
import {ProgressPart} from "../../Models/ProgressPart.ts";
import {ProgressState} from "@targoninc/lyda-shared/src/Enums/ProgressState";
import {
    AUDIO_ACCEPT,
    cleanTitle,
    defaultUploadState,
    filesFromDataTransfer,
    formatSize,
    isAudioFile,
    takePendingBulkFiles,
} from "../../Classes/UploadFileUtils.ts";
import {TrackEditTemplates} from "./TrackEditTemplates.ts";

type BulkUploadStatus = "queued" | "uploading" | "done" | "error";

interface BulkUploadItem {
    id: string;
    file: File;
    title: string;
    status: BulkUploadStatus;
    progress: Signal<ProgressPart | null>;
    error?: string;
    trackId?: number;
}

function defaultState(file: File) {
    return {...defaultUploadState(true), title: cleanTitle(file.name)};
}

export class BulkUploadTemplates {
    static page() {
        TrackEditTemplates.clearUploadDragState();
        const items = signal<BulkUploadItem[]>([]);
        const uploading = signal(false);

        const updateItem = (id: string, update: Partial<BulkUploadItem>) => {
            items.value = items.value.map(item => item.id === id ? {...item, ...update} : item);
        };

        const pendingFiles = takePendingBulkFiles();
        const addFiles = (files: File[]) => {
            const existing = new Set(items.value.map(item =>
                `${item.file.name}:${item.file.size}:${item.file.lastModified}`));
            const next = [...items.value];
            for (const file of files.filter(isAudioFile).sort((a, b) => a.name.localeCompare(b.name))) {
                const key = `${file.name}:${file.size}:${file.lastModified}`;
                if (existing.has(key)) {
                    continue;
                }
                existing.add(key);
                next.push({
                    id: crypto.randomUUID(),
                    file,
                    title: cleanTitle(file.name),
                    status: "queued",
                    progress: signal<ProgressPart | null>({
                        icon: "schedule",
                        text: `${t("QUEUED")}`,
                        state: ProgressState.notStarted,
                    }),
                });
            }
            items.value = next;
        };

        addFiles(pendingFiles);

        const resetInput = (input: HTMLInputElement) => {
            input.value = "";
        };

        const fileInput = create("input")
            .type(InputType.file)
            .attributes("accept", AUDIO_ACCEPT, "multiple", "")
            .styles("display", "none")
            .onchange(event => {
                const input = event.target as HTMLInputElement;
                addFiles(Array.from(input.files ?? []));
                resetInput(input);
            })
            .build() as HTMLInputElement;

        const folderInput = create("input")
            .type(InputType.file)
            .attributes("accept", AUDIO_ACCEPT, "multiple", "", "webkitdirectory", "")
            .styles("display", "none")
            .onchange(event => {
                const input = event.target as HTMLInputElement;
                addFiles(Array.from(input.files ?? []));
                resetInput(input);
            })
            .build() as HTMLInputElement;

        let dragDepth = 0;
        const dropzone = create("div")
            .classes("bulk-upload-dropzone")
            .onclick(() => fileInput.click())
            .ondragenter((event: DragEvent) => {
                event.preventDefault();
                dragDepth++;
                (event.currentTarget as HTMLElement).classList.add("bulk-upload-drag-over");
            })
            .ondragover((event: DragEvent) => {
                event.preventDefault();
            })
            .ondragleave((event: DragEvent) => {
                dragDepth--;
                if (dragDepth <= 0) {
                    dragDepth = 0;
                    (event.currentTarget as HTMLElement).classList.remove("bulk-upload-drag-over");
                }
            })
            .ondrop(async (event: DragEvent) => {
                event.preventDefault();
                dragDepth = 0;
                (event.currentTarget as HTMLElement).classList.remove("bulk-upload-drag-over");
                if (!event.dataTransfer) {
                    return;
                }
                try {
                    addFiles(await filesFromDataTransfer(event.dataTransfer));
                } catch (e) {
                    notify(`${t("FAILED_UPLOAD_ERROR", e)}`, NotificationType.error);
                }
            })
            .children(
                create("span").classes("material-symbols-outlined", "bulk-upload-icon").text("upload_file").build(),
                create("span").classes("bold").text(t("BULK_UPLOAD")).build(),
                create("span").classes("color-dim").text(t("DROP_AUDIO_FILE_HERE")).build(),
            ).build();

        const uploadAll = async () => {
            if (uploading.value || items.value.length === 0) {
                return;
            }

            uploading.value = true;
            for (const item of [...items.value]) {
                if (item.status === "done") {
                    continue;
                }

                updateItem(item.id, {status: "uploading", error: undefined});
                item.progress.value = {
                    icon: "cloud_upload",
                    text: `${t("UPLOADING_AUDIO")}`,
                    state: ProgressState.inProgress,
                    progress: 0,
                };
                try {
                    let trackId = item.trackId;
                    if (trackId === undefined) {
                        const track = await Api.createTrack(defaultState(item.file));
                        if (!track || track.id === undefined) {
                            throw new Error(`${t("FAILED_TO_CREATE_TRACK_ERROR", "")}`);
                        }
                        trackId = track.id;
                        updateItem(item.id, {trackId});
                    }

                    await MediaUploader.upload(
                        MediaFileType.audio,
                        trackId,
                        item.file,
                        event => {
                            item.progress.value = {
                                icon: "cloud_upload",
                                text: `${t("UPLOADING_AUDIO")}`,
                                state: ProgressState.inProgress,
                                progress: event.total > 0 ? (event.loaded / event.total) * 100 : 0,
                            };
                        },
                        {versionIndex: 1},
                    );
                    item.progress.value = {
                        icon: "check",
                        text: `${t("AUDIO_UPLOADED")}`,
                        state: ProgressState.complete,
                        progress: 100,
                    };
                    updateItem(item.id, {status: "done"});
                } catch (e) {
                    console.error("Bulk upload failed", e);
                    item.progress.value = {
                        icon: "error",
                        text: `${t("UPLOAD_FAILED")}`,
                        state: ProgressState.error,
                    };
                    updateItem(item.id, {
                        status: "error",
                        error: e instanceof Error ? e.message : String(e),
                    });
                }
            }
            uploading.value = false;

            if (items.value.length > 0 && items.value.every(item => item.status === "done")) {
                navigate(RoutePath.batchEdit);
            }
        };

        const list = compute(value => {
            if (value.length === 0) {
                return nullElement();
            }
            return create("div")
                .classes("flex-v", "small-gap", "bulk-upload-list")
                .children(...value.map(item => create("div")
                    .classes("card", "bulk-upload-row", "flex", "align-children", "space-between")
                    .children(
                        create("div")
                            .classes("flex-v", "small-gap", "flex-grow")
                            .children(
                                create("span").classes("bold").text(item.title).build(),
                                create("span")
                                    .classes("color-dim", TextSize.small)
                                    .text(`${item.file.name} · ${formatSize(item.file.size)}`)
                                    .build(),
                                when(!!item.error, create("span")
                                    .classes("error", TextSize.small)
                                    .text(item.error ?? "")
                                    .build()),
                            ).build(),
                        create("div")
                            .classes("flex", "align-children", "small-gap")
                            .children(
                                GenericTemplates.progressSectionPart(item.progress),
                                when(item.status === "queued", button({
                                    icon: {icon: "close"},
                                    text: t("REMOVE"),
                                    classes: ["negative"],
                                    onclick: () => items.value = items.value.filter(i => i.id !== item.id),
                                })),
                            ).build(),
                    ).build())).build();
        }, items);

        const startButton = button({
            text: compute(isUploading => isUploading ? `${t("UPLOADING_AUDIO")}` : `${t("START_UPLOAD")}`, uploading),
            icon: {icon: "upload"},
            classes: ["positive", "bigger-input", "rounded-max"],
            disabled: compute((_, isUploading) => isUploading || items.value.length === 0, items, uploading),
            onclick: uploadAll,
        });

        return create("div")
            .classes("flex-v", "noflexwrap", "big-gap")
            .children(
                create("h3").text(t("BULK_UPLOAD")).build(),
                create("span")
                    .classes("color-dim")
                    .text(t("BULK_UPLOAD_DESCRIPTION"))
                    .build(),
                dropzone,
                create("div")
                    .classes("flex", "align-children", "small-gap")
                    .children(
                        button({
                            text: t("CHOOSE_FILES"),
                            icon: {icon: "audio_file"},
                            onclick: () => fileInput.click(),
                        }),
                        button({
                            text: t("CHOOSE_FOLDER"),
                            icon: {icon: "folder_open"},
                            onclick: () => folderInput.click(),
                        }),
                        fileInput,
                        folderInput,
                    ).build(),
                list,
                create("div")
                    .classes("flex", "align-children", "small-gap")
                    .children(
                        startButton,
                        create("span")
                            .classes("color-dim", TextSize.small)
                            .text(compute(value => `${value.filter(i => i.status === "done").length}/${value.length}`, items))
                            .build(),
                    ).build(),
            ).build();
    }
}
