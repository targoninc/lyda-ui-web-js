export function dayFromValue(value: number|string|Date|null) {
    if (!value) {
        return new Date().toISOString().split("T")[0];
    }
    const date = new Date(value);
    return date.toISOString().split("T")[0];
}