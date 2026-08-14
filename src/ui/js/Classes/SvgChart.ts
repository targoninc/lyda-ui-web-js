import { area, curveMonotoneX, line } from "d3-shape";
import { AnyElement, compute, create, nullElement, signal } from "@targoninc/jess";
import { BoxPlotValues } from "@targoninc/lyda-shared/src/Models/BoxPlotValues";
import { t } from "../../locales";
import { ChartDatum } from "../Models/ChartDatum.ts";
import { MetadataRow } from "../Models/MetadataRow.ts";
import { LineChartConfig } from "../Models/LineChartConfig.ts";
import { BarChartConfig } from "../Models/BarChartConfig.ts";
import { BoxPlotConfig } from "../Models/BoxPlotConfig.ts";

const SVG_NS = "http://www.w3.org/2000/svg";

const CHART_WIDTH = 727;
const CHART_HEIGHT = 225;
const PAD_LEFT = 8;
const PAD_RIGHT = 12;
const PAD_TOP = 26;
const PAD_BOTTOM = 8;

const GRID_STROKE = "var(--fg-4)";
const LABEL_FILL = "var(--fg-4)";
const CROSSHAIR_STROKE = "var(--fg-3)";
const ACCENT = "var(--blue)";
const POSITIVE = "var(--green)";
const NEGATIVE = "var(--red)";
const BOX_FILL = "color-mix(in oklab, var(--blue), var(--bg-1) 70%)";

export function formatNumber(value: number): string {
    if (Math.abs(value) < 1e-9) {
        value = 0;
    }
    const abs = Math.abs(value);
    const digits = abs > 0 && abs < 1 ? 2 : abs < 10 ? 1 : 0;
    return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function formatPeriodLabel(label: string): string {
    const match = /^(\d{4})-(\d{2})$/.exec(label);
    if (!match) {
        return label;
    }
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, 1).toLocaleString(undefined, {
        month: "short",
        year: "numeric",
    });
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
    return document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
}

function svgWith<K extends keyof SVGElementTagNameMap>(
    tag: K,
    attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
    const node = svgEl(tag);
    for (const [key, value] of Object.entries(attrs)) {
        node.setAttribute(key, String(value));
    }
    return node;
}

function svgText(
    content: string,
    x: number,
    y: number,
    opts: { anchor?: "start" | "middle" | "end"; fill?: string; size?: number; weight?: number } = {},
): SVGTextElement {
    const node = svgWith("text", {
        x,
        y,
        fill: opts.fill ?? LABEL_FILL,
        "font-size": opts.size ?? 12,
        "font-weight": opts.weight ?? 400,
        "text-anchor": opts.anchor ?? "start",
    });
    node.textContent = content;
    return node;
}

const plotWidth = () => CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
const plotHeight = () => CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
const xAt = (i: number, n: number) => (n <= 1 ? PAD_LEFT + plotWidth() / 2 : PAD_LEFT + (plotWidth() * i) / (n - 1));
const yAt = (value: number, scale: { min: number; max: number }) =>
    CHART_HEIGHT - PAD_BOTTOM - ((value - scale.min) / (scale.max - scale.min)) * plotHeight();

function niceStep(rawStep: number): number {
    const exp = Math.floor(Math.log10(rawStep));
    const frac = rawStep / 10 ** exp;
    const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
    return niceFrac * 10 ** exp;
}

function ticks(scale: { min: number; max: number }, count = 4): number[] {
    if (!(scale.max > scale.min)) {
        return [scale.min];
    }
    const step = niceStep((scale.max - scale.min) / (count - 1));
    const result: number[] = [];
    const start = Math.ceil(scale.min / step) * step;
    for (let v = start; v <= scale.max + step * 1e-6; v += step) {
        result.push(v);
    }
    return result;
}

function domainFor(values: number[], baseline: number | null, includeZero: boolean) {
    const all = [...values];
    if (baseline !== null) {
        all.push(baseline);
    }
    let min = Math.min(...all);
    let max = Math.max(...all);
    if (includeZero) {
        min = Math.min(0, min);
    }
    if (max === min) {
        max = min + 1;
    }
    const pad = (max - min) * 0.08;
    return includeZero ? { min: 0, max: max + pad } : { min: min - pad, max: max + pad };
}

function evenlySpacedIndices(n: number, count: number): number[] {
    if (n <= count) {
        return Array.from({ length: n }, (_, i) => i);
    }
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
        result.push(Math.round((i * (n - 1)) / (count - 1)));
    }
    return result;
}

function signColor(value: number, baseline: number): string {
    return value >= baseline ? POSITIVE : NEGATIVE;
}

/**
 * Horizontal gradient that colors the line green/red depending on whether each
 * point sits above or below the baseline, with duplicated stops at crossings —
 * the same scheme Perplexity uses on their finance charts.
 */
function buildSignGradient(id: string, values: number[], baseline: number): SVGLinearGradientElement | null {
    const n = values.length;
    if (n < 2) {
        return null;
    }
    let allAbove = true;
    let allBelow = true;
    for (const v of values) {
        if (v >= baseline) {
            allBelow = false;
        } else {
            allAbove = false;
        }
    }
    if (allAbove || allBelow) {
        return null;
    }
    const gradient = svgWith("linearGradient", {
        id,
        x1: PAD_LEFT,
        x2: CHART_WIDTH - PAD_RIGHT,
        y1: 0,
        y2: 0,
        gradientUnits: "userSpaceOnUse",
    });
    const addStop = (offsetPct: number, color: string) => {
        gradient.appendChild(svgWith("stop", { offset: `${offsetPct}%`, "stop-color": color }));
    };
    addStop(0, signColor(values[0], baseline));
    for (let i = 1; i < n; i++) {
        const prev = values[i - 1];
        const current = values[i];
        if ((prev >= baseline) !== (current >= baseline)) {
            const t = (baseline - prev) / (current - prev);
            const crossingX = xAt(i - 1, n) + (xAt(i, n) - xAt(i - 1, n)) * t;
            const crossingOffset = (crossingX / CHART_WIDTH) * 100;
            addStop(crossingOffset, signColor(prev, baseline));
            addStop(crossingOffset, signColor(current, baseline));
        }
        addStop((xAt(i, n) / CHART_WIDTH) * 100, signColor(current, baseline));
    }
    return gradient;
}

/**
 * Vertical opacity mask that fades the area fill with distance from the
 * baseline (or from the top of the plot when there is no baseline).
 */
function buildAreaMask(id: string, baselineY: number | null): SVGMaskElement {
    const gradientId = `${id}-gradient`;
    const gradient = svgWith("linearGradient", {
        id: gradientId,
        x1: 0,
        y1: 0,
        x2: 0,
        y2: CHART_HEIGHT,
        gradientUnits: "userSpaceOnUse",
    });
    const stops: [number, number][] =
        baselineY === null
            ? [
                  [0, 0.35],
                  [100, 0],
              ]
            : [
                  [0, 0.3],
                  [(baselineY / CHART_HEIGHT) * 100, 0],
                  [100, 0.3],
              ];
    for (const [offset, opacity] of stops) {
        gradient.appendChild(
            svgWith("stop", { offset: `${offset}%`, "stop-color": "var(--contrast)", "stop-opacity": opacity }),
        );
    }
    const mask = svgEl("mask");
    mask.id = id;
    mask.setAttribute("maskUnits", "userSpaceOnUse");
    mask.setAttribute("maskContentUnits", "userSpaceOnUse");
    mask.appendChild(svgWith("rect", { x: 0, y: 0, width: CHART_WIDTH, height: CHART_HEIGHT, fill: `url(#${gradientId})` }));
    return mask;
}

function formatXLabel(label: string, showYear: boolean): string {
    const match = /^(\d{4})-(\d{2})$/.exec(label);
    if (!match) {
        return label;
    }
    const year = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const monthName = new Date(year, month, 1).toLocaleString(undefined, { month: "short" });
    return showYear ? `${monthName} ${match[1].slice(2)}` : monthName;
}

function formatTooltipHeader(label: string): string {
    const match = /^(\d{4})-(\d{2})$/.exec(label);
    if (!match) {
        return label;
    }
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, 1).toLocaleString(undefined, {
        month: "long",
        year: "numeric",
    });
}

interface TooltipRow {
    label: string;
    value: string;
    color?: string;
}

function buildTooltip(header: string, rows: TooltipRow[]): AnyElement {
    const headerEl = create("div").classes("chart-tooltip-header").text(header).build();
    const rowEls = rows.map(row => {
        const value = create("span")
            .classes("chart-tooltip-value")
            .styles("color", row.color ?? "")
            .text(row.value)
            .build();
        return create("div")
            .classes("chart-tooltip-row")
            .children(create("span").classes("chart-tooltip-label").text(row.label).build(), value)
            .build();
    });
    return create("div").children(headerEl, ...rowEls).build();
}

interface SnapResult {
    index: number;
    x: number;
    y: number;
}

function attachHover(
    container: AnyElement,
    svgRoot: SVGElement,
    snap: (vx: number, vy: number) => SnapResult | null,
    content: (index: number) => AnyElement,
): void {
    const index = signal<number | null>(null);
    const crossX = signal("0");
    const crossY = signal("0");
    const tipX = signal(0);
    const tipY = signal(0);

    const overlay = create("div")
        .classes("chart-overlay")
        .on("mousemove", (e: Event) => {
            const me = e as MouseEvent;
            const rect = svgRoot.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                return;
            }
            const vx = ((me.clientX - rect.left) / rect.width) * CHART_WIDTH;
            const vy = ((me.clientY - rect.top) / rect.height) * CHART_HEIGHT;
            const snapped = snap(vx, vy);
            if (!snapped) {
                index.value = null;
                return;
            }
            index.value = snapped.index;
            crossX.value = String(snapped.x);
            crossY.value = String(snapped.y);
            const px = (snapped.x / CHART_WIDTH) * rect.width;
            const py = (snapped.y / CHART_HEIGHT) * rect.height;
            const tipWidth = 200;
            const tipLeft = px > rect.width * 0.55 ? px - tipWidth - 16 : px + 16;
            tipX.value = Math.max(0, tipLeft);
            tipY.value = Math.min(Math.max(py + 12, 0), Math.max(0, rect.height - 90));
        })
        .on("mouseleave", () => {
            index.value = null;
        })
        .build();

    const verticalLine = create("line")
        .attributes(
            "x1", crossX,
            "x2", crossX,
            "y1", 0,
            "y2", CHART_HEIGHT,
            "stroke", CROSSHAIR_STROKE,
            "stroke-width", 1,
            "opacity", compute((i): string => (i === null ? "0" : "1"), index),
        )
        .build();
    const horizontalLine = create("line")
        .attributes(
            "x1", 0,
            "x2", CHART_WIDTH,
            "y1", crossY,
            "y2", crossY,
            "stroke", CROSSHAIR_STROKE,
            "stroke-width", 1,
            "opacity", compute((i): string => (i === null ? "0" : "1"), index),
        )
        .build();
    svgRoot.appendChild(verticalLine);
    svgRoot.appendChild(horizontalLine);

    const tooltip = create("div")
        .classes("chart-tooltip")
        .styles(
            "display", compute((i): string => (i === null ? "none" : "flex"), index),
            "transform", compute((x: number, y: number) => `translate(${x}px, ${y}px)`, tipX, tipY),
        )
        .children(compute(i => (i === null ? nullElement() : content(i)), index))
        .build();

    container.appendChild(overlay);
    container.appendChild(tooltip);
}

function chartContainer(svg: SVGElement): AnyElement {
    return create("div").classes("chart-plot").children(svg).build();
}

export function lineChart(data: ChartDatum[], id: string, config: LineChartConfig): AnyElement {
    const svgRoot = svgEl("svg");
    svgRoot.setAttribute("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
    svgRoot.setAttribute("class", "chart-svg");
    svgRoot.setAttribute("role", "img");
    svgRoot.setAttribute("aria-label", config.title);

    const defs = svgEl("defs");
    svgRoot.appendChild(defs);

    const baseline = config.baseline ?? null;
    const values = data.map(d => d.value);
    const scale = domainFor(values, baseline, config.includeZero ?? false);
    const points: [number, number][] = data.map((d, i) => [xAt(i, data.length), yAt(d.value, scale)]);

    const grid = svgEl("g");
    for (const tick of ticks(scale)) {
        const y = yAt(tick, scale);
        grid.appendChild(
            svgWith("line", {
                x1: 0,
                y1: y,
                x2: CHART_WIDTH,
                y2: y,
                stroke: GRID_STROKE,
                "stroke-width": 1,
                opacity: 0.1,
                "shape-rendering": "crispEdges",
            }),
        );
        grid.appendChild(svgText(formatNumber(tick), PAD_LEFT, y - 5));
    }
    const labelIndices = evenlySpacedIndices(data.length, 5);
    labelIndices.forEach((i, pos) => {
        const isLast = pos === labelIndices.length - 1;
        const x = xAt(i, data.length);
        grid.appendChild(
            svgWith("line", {
                x1: x,
                y1: 0,
                x2: x,
                y2: CHART_HEIGHT,
                stroke: GRID_STROKE,
                "stroke-width": 1,
                opacity: 0.1,
                "shape-rendering": "crispEdges",
            }),
        );
        grid.appendChild(
            svgText(formatXLabel(data[i].label, isLast), isLast ? CHART_WIDTH - PAD_RIGHT : x, 14, {
                anchor: isLast ? "end" : "start",
            }),
        );
    });
    svgRoot.appendChild(grid);

    let stroke: string = ACCENT;
    if (baseline !== null && data.length >= 2) {
        const gradient = buildSignGradient(`chart-gradient-${id}`, values, baseline);
        if (gradient) {
            defs.appendChild(gradient);
            stroke = `url(#chart-gradient-${id})`;
        } else {
            stroke = signColor(values[0], baseline);
        }
    }

    const baselineY = baseline !== null ? yAt(baseline, scale) : null;
    if (data.length >= 2) {
        const mask = buildAreaMask(`chart-area-mask-${id}`, baselineY);
        defs.appendChild(mask);
        const areaGen = area<[number, number]>()
            .x(p => p[0])
            .y0(baselineY ?? CHART_HEIGHT - PAD_BOTTOM)
            .y1(p => p[1])
            .curve(curveMonotoneX);
        const areaPath = areaGen(points);
        if (areaPath) {
            svgRoot.appendChild(svgWith("path", { d: areaPath, fill: stroke, mask: `url(#chart-area-mask-${id})` }));
        }

        if (baselineY !== null) {
            svgRoot.appendChild(
                svgWith("line", {
                    x1: 0,
                    y1: baselineY,
                    x2: CHART_WIDTH,
                    y2: baselineY,
                    stroke: GRID_STROKE,
                    "stroke-width": 1,
                    "stroke-dasharray": "4 4",
                }),
            );
        }

        const lineGen = line<[number, number]>()
            .x(p => p[0])
            .y(p => p[1])
            .curve(curveMonotoneX);
        const linePath = lineGen(points);
        if (linePath) {
            svgRoot.appendChild(svgWith("path", { d: linePath, fill: "none", stroke, "stroke-width": 1.75 }));
        }
    } else if (data.length === 1) {
        svgRoot.appendChild(svgWith("circle", { cx: points[0][0], cy: points[0][1], r: 3, fill: stroke }));
    }

    const container = chartContainer(svgRoot);
    attachHover(
        container,
        svgRoot,
        (vx) => {
            if (data.length === 0) {
                return null;
            }
            const step = plotWidth() / Math.max(1, data.length - 1);
            const raw = (vx - PAD_LEFT) / step;
            const i = Math.min(data.length - 1, Math.max(0, Math.round(raw)));
            return { index: i, x: xAt(i, data.length), y: yAt(data[i].value, scale) };
        },
        (i: number) => {
            const d = data[i];
            const rows: TooltipRow[] = [{ label: config.valueTitle, value: formatNumber(d.value) }];
            if (baseline !== null) {
                const delta = d.value - baseline;
                rows.push({
                    label: `${t("VS_START")}`,
                    value: `${delta >= 0 ? "+" : ""}${formatNumber(delta)}`,
                    color: delta >= 0 ? POSITIVE : NEGATIVE,
                });
            }
            return buildTooltip(formatTooltipHeader(d.label), rows);
        },
    );
    return container;
}

export function barChart(data: ChartDatum[], id: string, config: BarChartConfig): AnyElement {
    const svgRoot = svgEl("svg");
    svgRoot.setAttribute("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
    svgRoot.setAttribute("class", "chart-svg");
    svgRoot.setAttribute("role", "img");
    svgRoot.setAttribute("aria-label", config.title);

    const values = data.map(d => d.value);
    const scale = domainFor(values, null, true);
    const band = plotWidth() / Math.max(1, data.length);
    const barWidth = Math.min(band * 0.62, 48);
    const bottom = CHART_HEIGHT - 22;
    const yAtBar = (value: number) => bottom - ((value - scale.min) / (scale.max - scale.min)) * (bottom - PAD_TOP);

    const grid = svgEl("g");
    for (const tick of ticks(scale)) {
        const y = yAtBar(tick);
        grid.appendChild(
            svgWith("line", {
                x1: 0,
                y1: y,
                x2: CHART_WIDTH,
                y2: y,
                stroke: GRID_STROKE,
                "stroke-width": 1,
                opacity: 0.1,
                "shape-rendering": "crispEdges",
            }),
        );
        grid.appendChild(svgText(formatNumber(tick), PAD_LEFT, y - 5));
    }
    const labelIndices = evenlySpacedIndices(data.length, 6);
    labelIndices.forEach(i => {
        const x = xAt(i, data.length);
        grid.appendChild(
            svgWith("line", {
                x1: x,
                y1: 0,
                x2: x,
                y2: bottom,
                stroke: GRID_STROKE,
                "stroke-width": 1,
                opacity: 0.1,
                "shape-rendering": "crispEdges",
            }),
        );
        const label = data[i].label;
        const short = label.length > 12 ? `${label.slice(0, 11)}…` : label;
        grid.appendChild(svgText(short, x, CHART_HEIGHT - 5, { anchor: "middle" }));
    });
    svgRoot.appendChild(grid);

    const zeroY = yAtBar(0);
    data.forEach((d, i) => {
        const x = xAt(i, data.length);
        const y = yAtBar(d.value);
        svgRoot.appendChild(
            svgWith("rect", {
                x: x - barWidth / 2,
                y,
                width: Math.max(barWidth, 1),
                height: Math.max(zeroY - y, 1),
                rx: 3,
                fill: ACCENT,
            }),
        );
    });

    const container = chartContainer(svgRoot);
    attachHover(
        container,
        svgRoot,
        (vx) => {
            if (data.length === 0) {
                return null;
            }
            const step = plotWidth() / Math.max(1, data.length);
            const i = Math.min(data.length - 1, Math.max(0, Math.floor((vx - PAD_LEFT) / step)));
            return { index: i, x: xAt(i, data.length), y: yAtBar(data[i].value) };
        },
        (i: number) => {
            const d = data[i];
            return buildTooltip(d.label, [{ label: config.valueTitle, value: formatNumber(d.value) }]);
        },
    );
    return container;
}

export function boxPlotChart(values: BoxPlotValues, id: string, config: BoxPlotConfig): AnyElement {
    const svgRoot = svgEl("svg");
    svgRoot.setAttribute("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);
    svgRoot.setAttribute("class", "chart-svg");
    svgRoot.setAttribute("role", "img");
    svgRoot.setAttribute("aria-label", config.title);

    const scale = domainFor([values.min, values.q1, values.median, values.q3, values.max], null, false);
    const centerY = CHART_HEIGHT / 2;
    const boxHeight = 60;

    const grid = svgEl("g");
    for (const tick of ticks(scale)) {
        const x = xAtValue(tick, scale);
        grid.appendChild(
            svgWith("line", {
                x1: x,
                y1: 0,
                x2: x,
                y2: CHART_HEIGHT,
                stroke: GRID_STROKE,
                "stroke-width": 1,
                opacity: 0.1,
                "shape-rendering": "crispEdges",
            }),
        );
        grid.appendChild(svgText(formatNumber(tick), x, CHART_HEIGHT - 4, { anchor: "middle" }));
    }
    svgRoot.appendChild(grid);

    const minX = xAtValue(values.min, scale);
    const q1X = xAtValue(values.q1, scale);
    const medianX = xAtValue(values.median, scale);
    const q3X = xAtValue(values.q3, scale);
    const maxX = xAtValue(values.max, scale);

    svgRoot.appendChild(
        svgWith("line", {
            x1: minX,
            y1: centerY,
            x2: maxX,
            y2: centerY,
            stroke: ACCENT,
            "stroke-width": 1.25,
        }),
    );
    for (const capX of [minX, maxX]) {
        svgRoot.appendChild(
            svgWith("line", {
                x1: capX,
                y1: centerY - 8,
                x2: capX,
                y2: centerY + 8,
                stroke: ACCENT,
                "stroke-width": 1.25,
            }),
        );
    }
    if (q3X > q1X) {
        svgRoot.appendChild(
            svgWith("rect", {
                x: q1X,
                y: centerY - boxHeight / 2,
                width: q3X - q1X,
                height: boxHeight,
                rx: 3,
                fill: BOX_FILL,
                stroke: ACCENT,
                "stroke-width": 1.5,
            }),
        );
    }
    svgRoot.appendChild(
        svgWith("line", {
            x1: medianX,
            y1: centerY - boxHeight / 2,
            x2: medianX,
            y2: centerY + boxHeight / 2,
            stroke: "var(--fg-0)",
            "stroke-width": 2,
        }),
    );

    const container = chartContainer(svgRoot);
    attachHover(
        container,
        svgRoot,
        (vx, vy) => ({ index: 0, x: vx, y: Math.min(Math.max(vy, 0), CHART_HEIGHT) }),
        () =>
            buildTooltip(config.title, [
                { label: `${t("MIN")}`, value: formatNumber(values.min) },
                { label: `${t("Q1")}`, value: formatNumber(values.q1) },
                { label: `${t("MEDIAN")}`, value: formatNumber(values.median) },
                { label: `${t("Q3")}`, value: formatNumber(values.q3) },
                { label: `${t("MAX")}`, value: formatNumber(values.max) },
            ]),
    );
    return container;
}

function xAtValue(value: number, scale: { min: number; max: number }): number {
    return PAD_LEFT + ((value - scale.min) / (scale.max - scale.min)) * plotWidth();
}

export function metadataTable(rows: MetadataRow[]): AnyElement {
    const cells = rows.map(row =>
        create("div")
            .classes("chart-metadata-cell")
            .children(
                create("span").classes("chart-metadata-label").text(row.label).build(),
                create("span").classes("chart-metadata-value").text(row.value).build(),
            )
            .build(),
    );
    return create("div").classes("chart-metadata").children(...cells).build();
}
