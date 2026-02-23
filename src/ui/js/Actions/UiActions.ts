import {FeatureDetector} from "../Classes/Helpers/FeatureDetector.ts";

export class UiActions {
    static closeModal() {
        const modal = document.querySelector(".modal-container");
        if (modal) {
            modal.remove();
        }
    }

    static runMobileCheck() {
        if (FeatureDetector.isMobile()) {
            const metaTag = document.createElement("meta");
            metaTag.name = "viewport";
            metaTag.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0";
            document.getElementsByTagName("head")[0].appendChild(metaTag);
        }
    }
}