const debounceMap: Record<any, NodeJS.Timeout> = {};

export function debounce(identifier: any, func: () => void, delay: number = 0) {
    if (!delay) {
        func();
        return;
    }

    if (debounceMap[identifier]) {
        clearTimeout(debounceMap[identifier]);
    }

    debounceMap[identifier] = setTimeout(() => {
        func();
        delete debounceMap[identifier];
    }, delay);
}