export class Form {

    static getFieldValue(formId, fieldId) {
        const form = document.getElementById(formId);
        return form.querySelector(`#${fieldId}`).value;
    }
}