import {compute, create, nullElement, signal, Signal} from "@targoninc/jess";
import {button} from "@targoninc/jess-components";
import {GenericTemplates, horizontal, vertical} from "../generic/GenericTemplates.ts";
import {navigate} from "../../Routing/Router.ts";
import {RoutePath} from "../../Routing/routes.ts";
import {t} from "../../../locales";
import {ProgressPart} from "../../Models/ProgressPart.ts";
import {ProgressState} from "@targoninc/lyda-shared/src/Enums/ProgressState";
import {AudioUpload} from "../../Classes/AudioUpload.ts";
import {UploadableTrack} from "../../Models/UploadableTrack.ts";
import {
    AUDIO_ACCEPT,
    cleanTitle,
    defaultUploadState,
    filesFromDataTransfer,
    isAudioFile,
    takePendingBulkFiles,
    toFileList,
} from "../../Classes/UploadFileUtils.ts";
import {TrackEditTemplates} from "./TrackEditTemplates.ts";

type BulkUploadStatus = "queued" | "uploading" | "done" | "error";

interface BulkUploadItem {
    id: string;
    file: File;
    status: BulkUploadStatus;
    state: Signal<UploadableTrack>;
    progress: Signal<ProgressPart | null>;
    trackId?: number;
}

export class BulkUploadTemplates {
    static page() {
        TrackEditTemplates.clearUploadDragState();
        const items = signal<BulkUploadItem[]>([]);
        const uploading = signal(false);

        const addFiles = (files: File[]) => {
            const seen = new Set(items.value.map(item => `${item.file.name}:${item.file.size}:${item.file.lastModified}`));
            const additions = files
                .filter(isAudioFile)
                .filter(file => !seen.has(`${file.name}:${file.size}:${file.lastModified}`))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(file => ({
                    id: crypto.randomUUID(),
                    file,
                    status: "queued" as const,
                    state: signal<UploadableTrack>({
                        ...defaultUploadState(true),
                        title: cleanTitle(file.name),
                        audioFiles: toFileList([file]),
                    }),
                    progress: signal<ProgressPart | null>({
                        icon: "schedule",
                        text: `${t("QUEUED")}`,
                        state: ProgressState.notStarted,
                    }),
                }));
            items.value = [...items.value, ...additions];
        };

        let fileInput: HTMLInputElement | undefined;
        let folderInput: HTMLInputElement | undefined;
        const filePicker = GenericTemplates.fileInput(
            "bulk-files",
            "bulk-files",
            AUDIO_ACCEPT,
            `${t("CHOOSE_FILES")}`,
            false,
            (_, files) => {
                addFiles(Array.from(files ?? []));
                if (fileInput) {
                    fileInput.value = "";
                }
            },
            {multiple: true, onInput: input => fileInput = input},
        );
        const folderPicker = GenericTemplates.fileInput(
            "bulk-folder",
            "bulk-folder",
            AUDIO_ACCEPT,
            `${t("CHOOSE_FOLDER")}`,
            false,
            (_, files) => {
                addFiles(Array.from(files ?? []));
                if (folderInput) {
                    folderInput.value = "";
                }
            },
            {multiple: true, directory: true, onInput: input => folderInput = input},
        );

        const dragDepth = signal(0);
        const dragging = compute(depth => depth > 0, dragDepth);
        const dropzone = vertical(
            create("span").classes("material-symbols-outlined", "bulk-upload-icon").text("upload_file").build(),
            create("span").classes("bold").text(t("BULK_UPLOAD")).build(),
            create("span").classes("color-dim").text(t("DROP_AUDIO_FILE_HERE")).build(),
        ).classes("bulk-upload-dropzone", compute(drag => drag ? "bulk-upload-drag-over" : "_", dragging) as any)
            .onclick(() => fileInput?.click())
            .ondragenter((event: DragEvent) => {
                event.preventDefault();
                dragDepth.value++;
            })
            .ondragover((event: DragEvent) => event.preventDefault())
            .ondragleave(() => dragDepth.value = Math.max(0, dragDepth.value - 1))
            .ondrop(async (event: DragEvent) => {
                event.preventDefault();
                dragDepth.value = 0;
                if (!event.dataTransfer) {
                    return;
                }
                try {
                    addFiles(await filesFromDataTransfer(event.dataTransfer));
                } catch (e) {
                    console.error("Could not read dropped files", e);
                }
            }).build();

        const uploadAll = async () => {
            if (uploading.value || items.value.length === 0) {
                return;
            }
            uploading.value = true;
            for (const item of [...items.value]) {
                if (item.status === "done") {
                    continue;
                }
                items.value = items.value.map(entry => entry.id === item.id ? {...entry, status: "uploading"} : entry);
                try {
                    const result = await AudioUpload.upload(item.state, item.progress, {trackId: item.trackId});
                    items.value = items.value.map(entry => entry.id === item.id
                        ? {...entry, trackId: result.id, status: result.error ? "error" : "done"}
                        : entry);
                } catch (e) {
                    item.progress.value = {
                        icon: "error",
                        text: e instanceof Error ? e.message : String(e),
                        state: ProgressState.error,
                    };
                    items.value = items.value.map(entry => entry.id === item.id ? {...entry, status: "error"} : entry);
                }
            }
            uploading.value = false;
            if (items.value.every(item => item.status === "done")) {
                navigate(RoutePath.batchEdit);
            }
        };

        const list = compute(value => value.length === 0 ? nullElement() : vertical(
            ...value.map(item => horizontal(
                vertical(
                    create("span").classes("bold").text(cleanTitle(item.file.name)).build(),
                    create("span").classes("color-dim").text(item.file.name).build(),
                ).classes("flex-grow").build(),
                GenericTemplates.progressSectionPart(item.progress),
            ).classes("card", "bulk-upload-row").build()),
        ).classes("bulk-upload-list").build(), items);

        const startButton = button({
            text: compute(isUploading => isUploading ? `${t("UPLOADING_AUDIO")}` : `${t("START_UPLOAD")}`, uploading),
            icon: {icon: "upload"},
            classes: ["positive", "bigger-input", "rounded-max"],
            disabled: compute((_, isUploading) => isUploading || items.value.length === 0, items, uploading),
            onclick: uploadAll,
        });

        addFiles(takePendingBulkFiles());

        return vertical(
            create("h3").text(t("BULK_UPLOAD")).build(),
            create("span").classes("color-dim").text(t("BULK_UPLOAD_DESCRIPTION")).build(),
            dropzone,
            horizontal(filePicker, folderPicker).classes("small-gap").build(),
            list,
            startButton,
        ).classes("noflexwrap", "big-gap").build();
    }
}
