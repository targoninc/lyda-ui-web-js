import {Config} from "../Classes/Config.ts";

export class Images {
    static get BASE_URL() {
        return `${Config.storageBaseUrl}/storage/v2/images`;
    }

    static get FORMAT() {
        return ".webp";
    }

    static validateImage(image) {
        if (image === null || image === undefined || image === "") {
            return Images.None;
        }

        fetch(image).then((response) => {
            if (response.status === 404) {
                console.error("Image not found: ", image);
            }
        });

        return image;
    }
    static get None() {
        return Images.BASE_URL + "/none" + Images.FORMAT;
    }

    static IMAGE(fileName, format = ".webp") {
        return Images.validateImage(Images.BASE_URL + "/" + fileName + format);
    }

    static get DEFAULT_AVATAR() {
        return window.location.origin + "/img/defaults/avatar" + Images.FORMAT;
    }

    static get DEFAULT_BANNER() {
        return window.location.origin + "/img/defaults/banner" + Images.FORMAT;
    }
}