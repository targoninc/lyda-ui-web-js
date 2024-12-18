import {GenericTemplates} from "../Templates/GenericTemplates.ts";
import {MenuTemplates} from "../Templates/MenuTemplates.ts";
import {Util} from "../Classes/Util.ts";
import {FeatureDetector} from "../Classes/Helpers/FeatureDetector.ts";
import {Ui} from "../Classes/Ui.ts";
import {openMenus} from "../state.ts";

export class UiActions {
    static closeModal() {
        const modal = document.querySelector(".modal-container");
        if (modal) {
            modal.remove();
        }
    }

    static openCreateMenu() {
        const user = Util.getUserAsync();
        if (!user) {
            return;
        }
        let modal = GenericTemplates.modal([MenuTemplates.createMenu()], "create-menu");
        Ui.addModal(modal);
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