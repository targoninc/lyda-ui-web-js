export class UserValidator {
    static validateRegistration(state: any, touchedFields: Set<string>): Set<string> {
        let errors = new Set<string>();
        if (!state.username && touchedFields.has("username")) {
            errors.add("Username missing");
        }
        if (!state.displayname && touchedFields.has("displayname")) {
            errors.add("Display name missing");
        }
        if (!state.email && touchedFields.has("email")) {
            errors.add("Email missing");
        }
        if (!state.password && touchedFields.has("password")) {
            errors.add("Password missing");
        }
        if (state.password !== state.password2 && touchedFields.has("password2") && touchedFields.has("password")) {
            errors.add("Passwords do not match");
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