export function maxLengthValidator(length: number) {
    return (val: string) => {
        if (val && val.trim().length > length) {
            return [`Must be shorter than ${length} characters`];
        }
        return null;
    }
}

export function minLengthValidator(length: number) {
    return (val: string) => {
        if (val && val.trim().length < length) {
            return [`Must be longer than ${length} characters`];
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
            return [`Must be exactly ${length} characters long`];
        }
        return null;
    }
}