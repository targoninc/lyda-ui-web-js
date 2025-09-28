import { t } from "../../../locales";

export function maxLengthValidator(length: number) {
    return (val: string) => {
        if (val && val.trim().length > length) {
            return [`${t("ERROR_MUST_BE_SHORTER_N", length)}`];
        }
        return null;
    }
}

export function minLengthValidator(length: number, optional: boolean = false) {
    return (val: string) => {
        if (optional && (val.trim().length === 0)) {
            return null;
        }

        if (val && val.trim().length < length) {
            return [`${t("ERROR_MUST_BE_LONGER_N", length)}`];
        }
        return null;
    }
}

export function exactLengthValidator(length: number, optional: boolean = false) {
    return (val: string) => {
        if (optional && (val.trim().length === 0)) {
            return null;
        }

        if (val.trim().length !== length) {
            return [`${t("ERROR_MUST_BE_EXACTLY_N", length)}`];
        }
        return null;
    }
}