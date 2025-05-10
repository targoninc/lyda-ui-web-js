import {chartColor} from "../state.ts";

export class ChartOptions {
    static get defaultOptions() {
        return {
            plugins: {
                customCanvasBackgroundColor: {
                    color: "transparent",
                },
                legend: {
                    display: false
                }
            },
            animation: {
                duration: 0
            },
            hover: {
                animationDuration: 0,
            },
            scales: {
                y: {
                    ticks: {
                        color: chartColor.value,
                        font: {
                            size: 14
                        },
                        beginAtZero: true
                    },
                    grid: {
                        color: "rgba(123, 123, 123, .2)",
                    },
                },
                x: {
                    ticks: {
                        color: chartColor.value,
                        font: {
                            size: 14
                        },
                        beginAtZero: true
                    },
                    grid: {
                        color: "rgba(123, 123, 123, .2)",
                    },
                }
            },
            responsiveAnimationDuration: 0,
            devicePixelRatio: 2,
        };
    }

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