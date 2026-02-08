import { notify, Ui } from "../Classes/Ui.ts";
import { Images } from "../Enums/Images.ts";
import { Icons } from "../Enums/Icons.ts";
import { Signal } from "@targoninc/jess";
import { updateImagesWithSource, Util } from "../Classes/Util.ts";
import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";
import { NotificationType } from "../Enums/NotificationType.ts";
import { Api } from "../Api/Api.ts";
import { t } from "../../locales";
import { MediaUploader } from "../Api/MediaUploader.ts";

export class MediaActions {
    static async deleteMedia(type: MediaFileType, referenceId: number, image: Signal<string>, loading: Signal<boolean>) {
        const defaultImageForTypes: Record<MediaFileType, string> = {
            [MediaFileType.userAvatar]: Images.DEFAULT_AVATAR,
            [MediaFileType.userBanner]: Images.DEFAULT_BANNER,
            [MediaFileType.trackCover]: Images.DEFAULT_COVER_TRACK,
            [MediaFileType.audio]: Images.DEFAULT_COVER_TRACK,
            [MediaFileType.albumCover]: Images.DEFAULT_COVER_ALBUM,
            [MediaFileType.playlistCover]: Images.DEFAULT_COVER_PLAYLIST,
        };
        const defaultImage = defaultImageForTypes[type];

        await Ui.getConfirmationModal(t("REMOVE_IMAGE"), t("SURE_REMOVE_IMAGE"), t("YES"), t("NO"), async () => {
            loading.value = true;
            await Api.deleteMedia(type, referenceId);
            loading.value = false;
            notify(`${t("IMAGE_REMOVED")}`, NotificationType.success);
            updateImagesWithSource(defaultImage, image.value);
            image.value = defaultImage;
        }, () => {
        }, Icons.WARNING);
    }

    static async replaceImage(type: MediaFileType, id: number, canEdit: boolean, oldSrc: Signal<string>, loading: Signal<boolean>) {
        if (!canEdit) {
            return;
        }
        loading.value = true;
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async (e) => {
            const fileTarget = e.target as HTMLInputElement;
            const file = fileTarget.files![0];
            if (!file) {
                loading.value = false;
                return;
            }

            try {
                await MediaUploader.upload(type, id, file);
                notify(`${t("IMAGE_UPLOADED")}`, NotificationType.success);
                await Util.updateImage(URL.createObjectURL(file), oldSrc.value);
            } catch (e) {
                notify(`${t("FAILED_UPLOADING_IMAGE")}`, NotificationType.error);
            }
            loading.value = false;
        };
        fileInput.onabort = () => loading.value = false;
        fileInput.click();
    }
}