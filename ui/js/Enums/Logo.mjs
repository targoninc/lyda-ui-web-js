export class Logo {
    static get BASE_URL() {
        return window.location.origin + "/img/service/";
    }

    static get IMAGE_FORMAT() {
        return ".svg";
    }

    static validateIcon(icon) {
        if (icon === null || icon === undefined || icon === "") {
            return Logo.LYDA;
        }

        fetch(icon).then((response) => {
            if (response.status === 404) {
                console.error("Icon not found: ", icon);
            }
        });

        return icon;
    }

    static LOGO(fileName) {
        return Logo.validateIcon(Logo.BASE_URL + fileName + Logo.IMAGE_FORMAT);
    }

    static get LYDA() {
        return Logo.LOGO("lyda_bicolor");
    }

    static get SUBSCRIPTIONS() {
        return Logo.LOGO("subscriptions/subscriptions_bicolor");
    }

    static get ACCOUNTS() {
        return Logo.LOGO("accounts/icon_bicolor");
    }
}