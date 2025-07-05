import {notify, Ui} from "../Classes/Ui.ts";
import {Images} from "../Enums/Images.ts";
import {Icons} from "../Enums/Icons.ts";
import {Signal} from "@targoninc/jess";
import {updateImagesWithSource} from "../Classes/Util.ts";
import {MediaFileType} from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";
import {NotificationType} from "../Enums/NotificationType.ts";
import { Api } from "../Api/Api.ts";

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

        await Ui.getConfirmationModal("Remove image", "Are you sure you want to remove this image?", "Yes", "No", async () => {
            loading.value = true;
            await Api.deleteMedia(type, referenceId);
            loading.value = false;
            notify("Image removed", NotificationType.success);
            updateImagesWithSource(defaultImage, image.value);
            image.value = defaultImage;
        }, () => {
        }, Icons.WARNING);
    }
}