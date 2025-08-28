import { exactLengthValidator, maxLengthValidator, minLengthValidator } from "./validators.ts";

export class TrackValidators {
    static creditsValidators = [maxLengthValidator(512)];
    static artistnameValidators = [maxLengthValidator(128)];
    static titleValidators = [maxLengthValidator(255)];
    static isrcValidators = [exactLengthValidator(12, true)];
    static upcValidators = [minLengthValidator(12, true)];
    static descriptionValidators = [maxLengthValidator(2048)];
}