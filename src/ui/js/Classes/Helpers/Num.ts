export class Num {
    static shortenInArray(array: (number|string)[]) {
        return array.map((a) => {
            return Num.shorten(a);
        });
    }

    static shorten(number: string|number) {
        if (number.constructor !== Number) {
            number = parseInt(number as string);
        }
        if (number > 1000000) {
            return Math.round(number / 1000000) + "m";
        } else if (number > 1000) {
            return Math.round(number / 1000) + "k";
        }
        return number;
    }
}

export function currency(number: any, currency = "USD") {
    if (!number) {
        return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(0);
    }
    if (number.constructor === String && number.includes(".")) {
        number = parseFloat(number as string);
    }
    if (number.constructor !== Number) {
        number = parseInt(number);
    }
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(number);
}
