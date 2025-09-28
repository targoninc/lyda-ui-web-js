import { AuthData } from "../../Templates/LandingPageTemplates.ts";
import { t } from "../../../locales";

const regexps: Record<string, RegExp> = {
    whitespace: new RegExp(/\s/g)
};

export class UserValidator {
    static validateRegistration(state: AuthData, touchedFields: Set<string>): string[] {
        const errors = new Set<string>();
        if (!state.username) {
            errors.add(`${t("ERROR_USERNAME_MISSING")}`);
        }
        if (state.username.match(regexps.whitespace)) {
            errors.add(`${t("ERROR_USERNAME_CONTAINS_WHITESPACE")}`);
        }
        if (!state.email) {
            errors.add(`${t("ERROR_EMAIL_MISSING")}`);
        }
        if (state.email.match(regexps.whitespace)) {
            errors.add(`${t("ERROR_EMAIL_CONTAINS_WHITESPACE")}`);
        }
        if (!state.password) {
            errors.add(`${t("ERROR_PASSWORD_MISSING")}`);
        }
        if (!state.password2) {
            errors.add(`${t("ERROR_PASSWORD_REPEAT_MISSING")}`);
        }
        if (state.password !== state.password2 && touchedFields.has("password2") && touchedFields.has("password")) {
            errors.add(`${t("ERROR_PASSWORDS_DO_NOT_MATCH")}`);
        }
        if (state.password.length > 64) {
            errors.add(`${t("ERROR_PASSWORD_TOO_LONG")}`);
        }
        if (!state.termsOfService) {
            errors.add(`${t("ERROR_TERMS_OF_SERVICE_AND_PRIVACY_POLICY")}`);
        }
        return [...errors];
    }

    static validateLogin(state: any): string[] {
        const errors = new Set<string>();
        if (!state.email) {
            errors.add(`${t("ERROR_EMAIL_MISSING")}`);
        }
        if (!state.password) {
            errors.add(`${t("ERROR_PASSWORD_MISSING")}`);
        }
        return [...errors];
    }

    static validatePasswordReset(state: any): string[] {
        const errors = new Set<string>();
        if (!state.password) {
            errors.add(`${t("ERROR_PASSWORD_MISSING")}`);
        }
        if (!state.password2) {
            errors.add(`${t("ERROR_PASSWORD_REPEAT_MISSING")}`);
        }
        if (state.password !== state.password2) {
            errors.add(`${t("ERROR_PASSWORDS_DO_NOT_MATCH")}`);
        }
        return [...errors];
    }

    static validateEmailCheck(state: any): string[] {
        const errors = new Set<string>();
        if (!state.email) {
            errors.add(`${t("ERROR_EMAIL_MISSING")}`);
        }
        return [...errors];
    }
}