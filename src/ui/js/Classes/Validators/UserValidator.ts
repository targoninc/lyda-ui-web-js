import {AuthData} from "../../Templates/LandingPageTemplates.ts";

export class UserValidator {
    static validateRegistration(state: AuthData, touchedFields: Set<string>): Set<string> {
        let errors = new Set<string>();
        if (!state.username) {
            errors.add("Username missing");
        }
        if (!state.email) {
            errors.add("Email missing");
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
        if (!state.termsOfService) {
            errors.add("You must agree to the Terms of Service and Privacy Policy");
        }
        return errors;
    }

    static validateLogin(state: any): Set<string> {
        let errors = new Set<string>();
        if (!state.email) {
            errors.add("E-Mail address missing");
        }
        if (!state.password) {
            errors.add("Password missing");
        }
        return errors;
    }

    static validatePasswordReset(state: any): Set<string> {
        let errors = new Set<string>();
        if (!state.email) {
            errors.add("Email missing");
        }
        return errors;
    }

    static validateEmailCheck(state: any): Set<string> {
        let errors = new Set<string>();
        if (!state.email) {
            errors.add("E-Mail address missing");
        }
        return errors;
    }
}