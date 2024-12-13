import {Icons} from "./Icons.js";

export class Badges {
    static BADGE(name) {
        return Icons.ICON("badges/badge_" + name);
    }

    static get STAFF() {
        return Badges.BADGE("staff");
    }

    static get SUPPORT_LISTENER() {
        return Badges.BADGE("support_listener");
    }

    static get SUPPORT_ENTHUSIAST() {
        return Badges.BADGE("support_enthusiast");
    }

    static get SUPPORT_AUDIOPHILE() {
        return Badges.BADGE("support_audiophile");
    }

    static get CUTE() {
        return Badges.BADGE("cute");
    }

    static get VIP() {
        return Badges.BADGE("vip");
    }
}