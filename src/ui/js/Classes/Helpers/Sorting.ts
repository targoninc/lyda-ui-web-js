export function sortByProperty<T>(c: keyof T | null, l: T[]) {
    if (!c) {
        return l;
    }

    return l.sort((a, b) => {
        const aProp = a[c];
        const bProp = b[c];
        if (typeof aProp === "number" && typeof bProp === "number") {
            return aProp - bProp;
        }

        if (typeof aProp === "object" && typeof bProp === "object") {
            if (aProp instanceof Object && bProp instanceof Object) {
                return JSON.stringify(aProp).localeCompare(JSON.stringify(bProp));
            }

            if (aProp instanceof Array && bProp instanceof Array) {
                return aProp.length - bProp.length;
            }
        }

        const timeIndicators = ["time", "_at"];
        if (timeIndicators.some(ti => (c as string).includes(ti))) {
            return new Date(bProp as string).getTime() - new Date(aProp as string).getTime();
        }

        return (aProp as string).localeCompare(bProp as string);
    });
}
