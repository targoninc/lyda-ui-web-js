export class UserValidator {
    /**
     *
     * @param state {Object}
     * @param touchedFields {Set<string>}
     * @returns {Set<any>}
     */
    static validateRegistration(state, touchedFields) {
        let errors = new Set();
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

    /**
     *
     * @param state
     * @returns {Set<any>}
     */
    static validateLogin(state) {
        let errors = new Set();
        if (!state.email) {
            errors.add("E-Mail address missing");
        }
        if (!state.password) {
            errors.add("Password missing");
        }
        return errors;
    }

    /**
     *
     * @param state
     * @returns {Set<any>}
     */
    static validatePasswordReset(state) {
        let errors = new Set();
        if (!state.email) {
            errors.add("Email missing");
        }
        return errors;
    }

    /**
     *
     * @param state
     * @returns {Set<any>}
     */
    static validateEmailCheck(state) {
        let errors = new Set();
        if (!state.email) {
            errors.add("E-Mail address missing");
        }
        return errors;
    }
}