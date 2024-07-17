export class Num {
    static shortenInArray(array) {
        return array.map((a) => {
            return Num.shorten(a);
        });
    }

    static shorten(number) {
        if (number.constructor !== Number) {
            number = parseInt(number);
        }
        if (number > 1000000) {
            return Math.round(number / 1000000) + "m";
        } else if (number > 1000) {
            return Math.round(number / 1000) + "k";
        }
        return number;
    }

    static currency(number, currency = "USD") {
        if (!number) {
            return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(0);
        }
        if (number.constructor === String && number.includes(".")) {
            number = parseFloat(number);
        }
        if (number.constructor !== Number) {
            number = parseInt(number);
        }
        return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(number);
    }
}