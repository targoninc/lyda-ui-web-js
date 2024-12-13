export class Colors {
    static uniqueList = [
        "hsl(0, 100%, 50%)",
        "hsl(25, 100%, 50%)",
        "hsl(50, 100%, 50%)",
        "hsl(75, 100%, 50%)",
        "hsl(100, 100%, 50%)",
        "hsl(125, 100%, 50%)",
        "hsl(150, 100%, 50%)",
        "hsl(175, 100%, 50%)",
        "hsl(200, 100%, 50%)",
        "hsl(225, 100%, 50%)",
        "hsl(250, 100%, 50%)",
        "hsl(275, 100%, 50%)",
        "hsl(300, 100%, 50%)",
        "hsl(325, 100%, 50%)",
    ];

    static get themedList() {
        const css = getComputedStyle(document.documentElement);
        const colors = [];
        for (let i = 1; i <= 12; i++) {
            colors.push(css.getPropertyValue(`--stats-${i}`));
        }
        return colors;
    }
}