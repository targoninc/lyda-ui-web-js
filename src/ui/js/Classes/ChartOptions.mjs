export class ChartOptions {
    static defaultOptions = {
        plugins: {
            customCanvasBackgroundColor: {
                color: "transparent",
            }
        },
        animation: {
            duration: 0
        },
        hover: {
            animationDuration: 0,
        },
        responsiveAnimationDuration: 0,
        devicePixelRatio: 2,
    };
    static noGridOptions = {
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    display: false
                },
                border: {
                    display: false
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    display: false
                },
                border: {
                    display: false
                }
            }
        }
    };
}