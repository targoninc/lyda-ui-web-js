import {AuthData} from "../../Templates/LandingPageTemplates.ts";

const regexps: Record<string, RegExp> = {
    whitespace: new RegExp(/\s/g)
};

export class UserValidator {
    static validateRegistration(state: AuthData, touchedFields: Set<string>): string[] {
        let errors = new Set<string>();
        if (!state.username) {
            errors.add("Username missing");
        }
        if (state.username.match(regexps.whitespace)) {
            errors.add("Username can't contain whitespace");
        }
        if (!state.email) {
            errors.add("Email missing");
        }
        if (state.email.match(regexps.whitespace)) {
            errors.add("Username can't contain whitespace");
        }
        if (!state.password) {
            errors.add("Password missing");
        }
        if (!state.password2) {
            errors.add("Repeat password missing");
        }
        if (state.password !== state.password2 && touchedFields.has("password2") && touchedFields.has("password")) {
            errors.add("Passwords do not match");
        }
        if (state.password.length > 64) {
            errors.add("Password must be shorter than 64 characters");
        }
        if (!state.termsOfService) {
            errors.add("You must agree to the Terms of Service and Privacy Policy");
        }
        return [...errors];
    }

    static validateLogin(state: any): string[] {
        let errors = new Set<string>();
        if (!state.email) {
            errors.add("E-Mail address missing");
        }
        if (!state.password) {
            errors.add("Password missing");
        }
        return [...errors];
    }

    static validatePasswordReset(state: any): string[] {
        let errors = new Set<string>();
        if (!state.password) {
            errors.add("Password missing");
        }
        if (!state.password2) {
            errors.add("Repeat password missing");
        }
        if (state.password !== state.password2) {
            errors.add("Passwords do not match");
        }
        return [...errors];
    }

    static validateEmailCheck(state: any): string[] {
        let errors = new Set<string>();
        if (!state.email) {
            errors.add("E-Mail address missing");
        }
        return [...errors];
    }
}