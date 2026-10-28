import {compute, create, InputType, nullElement, signal, Signal} from "@targoninc/jess";
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

        const makeInput = (directory: boolean) => create("input")
            .type(InputType.file)
            .attributes("accept", AUDIO_ACCEPT, "multiple", "", ...(directory ? ["webkitdirectory", ""] : []))
            .styles("display", "none")
            .onchange(event => {
                const input = event.target as HTMLInputElement;
                addFiles(Array.from(input.files ?? []));
                input.value = "";
            })
            .build() as HTMLInputElement;

        const fileInput = makeInput(false);
        const folderInput = makeInput(true);

        let dragDepth = 0;
        const dropzone = vertical(
            create("span").classes("material-symbols-outlined", "bulk-upload-icon").text("upload_file").build(),
            create("span").classes("bold").text(t("BULK_UPLOAD")).build(),
            create("span").classes("color-dim").text(t("DROP_AUDIO_FILE_HERE")).build(),
        ).classes("bulk-upload-dropzone")
            .onclick(() => fileInput.click())
            .ondragenter((event: DragEvent) => {
                event.preventDefault();
                dragDepth++;
                (event.currentTarget as HTMLElement).classList.add("bulk-upload-drag-over");
            })
            .ondragover((event: DragEvent) => event.preventDefault())
            .ondragleave((event: DragEvent) => {
                if (--dragDepth > 0) {
                    return;
                }
                dragDepth = 0;
                (event.currentTarget as HTMLElement).classList.remove("bulk-upload-drag-over");
            })
            .ondrop(async (event: DragEvent) => {
                event.preventDefault();
                dragDepth = 0;
                (event.currentTarget as HTMLElement).classList.remove("bulk-upload-drag-over");
                if (event.dataTransfer) {
                    try {
                        addFiles(await filesFromDataTransfer(event.dataTransfer));
                    } catch (e) {
                        console.error("Could not read dropped files", e);
                    }
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
            horizontal(
                button({text: t("CHOOSE_FILES"), icon: {icon: "audio_file"}, onclick: () => fileInput.click()}),
                button({text: t("CHOOSE_FOLDER"), icon: {icon: "folder_open"}, onclick: () => folderInput.click()}),
                fileInput,
                folderInput,
            ).classes("small-gap").build(),
            list,
            startButton,
        ).classes("noflexwrap", "big-gap").build();
    }
}
