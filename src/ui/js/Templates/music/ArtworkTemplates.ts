import { AnyElement, compute, create, HtmlPropertyValue, isSignal, signal, Signal, StringOrSignal, TypeOrSignal, when } from "@targoninc/jess";
import { GenericTemplates } from "../generic/GenericTemplates.ts";
import { Icons } from "../../Enums/Icons.ts";
import { getTranslation, language, t } from "../../../locales";
import { createCdJewelCase3D } from "../../Classes/Artwork3D.ts";
import { trackCleanup } from "../../Classes/Helpers/PageLifecycle.ts";
import { currency } from "../../Classes/Helpers/Num.ts";

export type ArtworkFormat = "cover" | "cd" | "vinyl";

export type ArtworkStickerShape = "star" | "burst";

/** The element returned by `artworkDisplay`; exposes the 3D renderer cleanup for CD cases. */
export interface ArtworkWithCleanup extends HTMLElement {
    __artwork3dDispose?: () => void;
}

export interface ArtworkOptions {
    alt?: string;
    /** How the artwork is displayed: flat cover, 3d cd or 3d vinyl. */
    format?: ArtworkFormat;
    /** Fixed size in px; falls back to the CSS `--artwork-size`. */
    size?: number;
    /** Show a small "bought" sticker. */
    bought?: TypeOrSignal<boolean>;
    /** Show a small "liked" sticker. */
    liked?: TypeOrSignal<boolean>;
    /** Show a small "reposted" sticker. */
    reposted?: TypeOrSignal<boolean>;
    /** Top fan of the artist: shows a signature when the item is also bought. */
    topFan?: TypeOrSignal<boolean>;
    /** The artist's actual signature (e.g. artist name). Falls back to a generated scribble. */
    signatureText?: string;
    /** Base price (e.g. 4.99) shown on the bought sticker instead of the check label. */
    price?: TypeOrSignal<number>;
    /** The amount actually paid; anything above `price` adds an extra "EXTRA +$x.xx" sticker. */
    paidAmount?: TypeOrSignal<number>;
    /** Seed for deterministic randomization (sticker shapes, signature). Defaults to a hash of the url. */
    seed?: number;
    /** Master switch for the decorative stickers (default true). */
    showStickers?: boolean;
    onclick?: Function;
    classes?: string[];
}

export function artworkDisplay(url: StringOrSignal, opts: ArtworkOptions = {}): AnyElement {
    const format = opts.format ?? "cover";
    const rand = mulberry32(opts.seed ?? hashString(urlValue(url)));
    const artSize = opts.size ?? 200;
    const bought$ = toBooleanSignal(opts.bought);
    const liked$ = toBooleanSignal(opts.liked);
    const reposted$ = toBooleanSignal(opts.reposted);
    const price$ = toNumberSignal(opts.price);
    const paidAmount$ = toNumberSignal(opts.paidAmount);
    // Rough corner placement: price + extra top right, like + repost bottom
    // right, signature bottom left. The 3D case render leaves an empty band at
    // the top/bottom of the box; keep stickers fully on the CD surface.
    const topInset = format === "cd" ? 0.125 : 0;
    const bottomInset = format === "cd" ? 0.125 : 0;
    const boughtPosition = stickerCornerPosition(rand, artSize, "topRight", topInset);
    const extraPosition = stickerStacked(rand, artSize, boughtPosition, "down");
    const likedPosition = stickerCornerPosition(rand, artSize, "bottomRight", bottomInset);
    const repostedPosition = stickerStacked(rand, artSize, likedPosition, "up");
    const extra$ = compute(
        (paid, price) => (paid != null && price != null && paid > price ? paid - price : null),
        paidAmount$,
        price$,
    );

    const children: (AnyElement | Signal<AnyElement>)[] = [];
    if (format === "cd") {
        children.push(
            create("canvas")
                .classes("artwork-disc", "artwork-3d-canvas")
                .attributes("aria-hidden", "true")
                .build(),
        );
    } else if (format === "vinyl") {
        children.push(
            create("div").classes("artwork-vinyl-disc").build(),
            create("div")
                .classes("artwork-disc", "relative")
                .children(
                    create("img")
                        .classes("artwork-image")
                        .src(url)
                        .alt(opts.alt ?? "")
                        .build(),
                    create("div").classes("artwork-vinyl-wrap").build(),
                ).build(),
        );
    } else {
        children.push(
            create("div")
                .classes("artwork-disc", "relative")
                .children(
                    create("img")
                        .classes("artwork-image")
                        .src(url)
                        .alt(opts.alt ?? "")
                        .build(),
                ).build(),
        );
    }

    const overlayChildren: (AnyElement | Signal<AnyElement>)[] = [];
    if (opts.showStickers !== false) {
        overlayChildren.push(
            when(bought$, () => artworkSticker({
                icon: null,
                text: compute(
                    price => (price != null ? currency(price) : String(getTranslation("BOUGHT", language.value))),
                    price$,
                ),
                colorClass: "artwork-sticker-price",
                rand,
                artSize,
                position: boughtPosition,
                rect: true,
            })),
            when(liked$, () => artworkSticker({
                icon: Icons.LIKE,
                text: "",
                colorClass: "artwork-sticker-liked",
                rand,
                artSize,
                position: likedPosition,
            })),
            when(reposted$, () => artworkSticker({
                icon: Icons.REPOST,
                text: "",
                colorClass: "artwork-sticker-reposted",
                rand,
                artSize,
                position: repostedPosition,
            })),
            when(extra$, () => artworkExtraSticker({
                amount: extra$ as Signal<number>,
                rand,
                artSize,
                position: extraPosition,
                topInset,
            })),
        );
    }

    const signed$ = compute(
        (topFan, bought) => Boolean(topFan && bought),
        toBooleanSignal(opts.topFan),
        bought$,
    );
    overlayChildren.push(
        when(signed$, () => artworkSignature(opts.signatureText ?? null, rand)),
    );
    // Optional parallax rotates this plane with the same angles as the 3D
    // model, so stickers/signature track the case instead of detaching.
    children.push(
        create("div").classes("artwork-overlays").children(...overlayChildren).build(),
    );

    const root = create("div")
        .classes("artwork", "relative", `artwork-format-${format}`, ...(opts.classes ?? []))
        .children(...children);
    if (opts.onclick) {
        root.classes("pointer").onclick(opts.onclick);
    }
    const node = root.build();
    if (opts.size !== undefined) {
        // jess styles() uses direct style assignment, which does not work for
        // CSS custom properties; set it after build instead.
        node.style.setProperty("--artwork-size", `${opts.size}px`);
    }
    if (format === "cd") {
        const canvas = node.querySelector("canvas") as HTMLCanvasElement | null;
        if (canvas) {
            const handle = createCdJewelCase3D(canvas, urlValue(url), opts.size);
            trackCleanup(handle.dispose);
            (node as ArtworkWithCleanup).__artwork3dDispose = handle.dispose;
        }
        attachArtworkParallax(node as HTMLElement);
    }
    return node;
}

/**
 * Pointer parallax on the whole artwork container (case + stickers +
 * signature as one unit), so nothing can detach or drift away.
 */
function attachArtworkParallax(root: HTMLElement) {
    const state = { targetX: 0, targetY: 0, x: 0, y: 0 };
    let frameId = 0;
    const onPointerMove = (event: PointerEvent) => {
        const rect = root.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        state.targetX = (-ny * 0.12 * 180) / Math.PI;
        state.targetY = (nx * 0.3 * 180) / Math.PI;
    };
    const onPointerLeave = () => {
        state.targetX = 0;
        state.targetY = 0;
    };
    const tick = () => {
        frameId = requestAnimationFrame(tick);
        const ease = 0.08;
        state.x += (state.targetX - state.x) * ease;
        state.y += (state.targetY - state.y) * ease;
        root.style.transform = `perspective(700px) rotateX(${state.x.toFixed(3)}deg) rotateY(${state.y.toFixed(3)}deg)`;
    };
    tick();
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", onPointerLeave);
    trackCleanup(() => {
        cancelAnimationFrame(frameId);
        root.removeEventListener("pointermove", onPointerMove);
        root.removeEventListener("pointerleave", onPointerLeave);
        root.style.transform = "";
    });
}

function artworkSticker(opts: {
    icon: string | null;
    text: HtmlPropertyValue;
    colorClass: string;
    rand: () => number;
    artSize?: number;
    position?: { x: number; y: number };
    /** Rounded rectangle sticker sized to its content (no clip shape). */
    rect?: boolean;
    /** Extra top inset (fraction of the artwork size) so stickers stay on the CD surface. */
    topInset?: number;
}): AnyElement {
    const spec = opts.rect ? null : stickerShapeSpec(opts.rand);
    const position = opts.position ?? stickerCornerPosition(opts.rand, opts.artSize ?? 200, "topRight", opts.topInset ?? 0);
    const rotation = spec?.rotation ?? Math.round(opts.rand() * 28 - 14);
    const textChildren = typeof opts.text === "string"
        ? (opts.text ? [stickerText(opts.text)] : [])
        : [stickerText(opts.text)];
    const title = typeof opts.text === "string" && opts.text ? opts.text : t("BOUGHT");
    const contentWrapper = create("div")
        .classes("artwork-sticker-content")
        .children(
            opts.icon ? GenericTemplates.icon(opts.icon, false, ["artwork-sticker-icon"]) : null,
            ...textChildren,
        ).build();
    const outlineScale = 1.12;
    const childNodes = spec
        ? [
            // Layered clip so the hard black shadow renders behind the body in
            // every browser (no filter/pseudo paint-order surprises).
            create("div").classes("artwork-sticker-shadow").styles(
                "clip-path", `polygon(${spec.clip})`,
                "transform", `translate(1px, 1px) scale(${outlineScale})`,
            ).build(),
            create("div").classes("artwork-sticker-outline").styles(
                "clip-path", `polygon(${spec.clip})`,
                "transform", `scale(${outlineScale})`,
            ).build(),
            create("div").classes("artwork-sticker-body").styles(
                "clip-path", `polygon(${spec.clip})`,
            ).children(contentWrapper).build(),
        ]
        : [contentWrapper];

    const shell = create("div")
        .classes("artwork-sticker", opts.colorClass, ...(spec ? ["artwork-sticker-shaped", spec.shapeClass] : []))
        .styles(
            "top", `${(position.y * 100).toFixed(2)}%`,
            "left", `${(position.x * 100).toFixed(2)}%`,
            "transform", `translate(-50%, -50%) rotate(${rotation}deg)`,
        )
        .title(title)
        .children(...childNodes)
        .build();

    const sticker = shell as ArtworkStickerElement;
    sticker.__artworkStickerShape = spec ? { points: spec.points } : undefined;
    sticker.__artworkStickerRect = Boolean(opts.rect);
    sticker.__artworkStickerRotation = rotation;
    fitStickerWhenReady(sticker);
    trackCleanup(() => sticker.__artworkStickerObserver?.disconnect());
    return shell;
}

function artworkExtraSticker(opts: {
    amount: Signal<number>;
    rand: () => number;
    artSize?: number;
    position?: { x: number; y: number };
    topInset?: number;
}): AnyElement {
    const rotation = Math.round(opts.rand() * 28 - 14);
    const position = opts.position ?? stickerCornerPosition(opts.rand, opts.artSize ?? 200, "topRight", opts.topInset ?? 0);

    const shell = create("div")
        .classes("artwork-sticker", "artwork-sticker-extra")
        .styles(
            "top", `${(position.y * 100).toFixed(2)}%`,
            "left", `${(position.x * 100).toFixed(2)}%`,
            "transform", `translate(-50%, -50%) rotate(${rotation}deg)`,
        )
        .title(t("EXTRA"))
        .children(
            create("div")
                .classes("artwork-sticker-content", "artwork-sticker-extra-content")
                .children(
                    create("div").classes("artwork-extra-label").text(t("EXTRA")).build(),
                    create("div").classes("artwork-extra-amount").text(
                        compute(v => `+${currency(v)}`, opts.amount),
                    ).build(),
                ).build(),
        ).build();

    const sticker = shell as ArtworkStickerElement;
    sticker.__artworkStickerRect = true;
    sticker.__artworkStickerSize = 0.5;
    sticker.__artworkStickerRotation = rotation;
    fitStickerWhenReady(sticker);
    trackCleanup(() => sticker.__artworkStickerObserver?.disconnect());
    return shell;
}

/** Shared randomized sticker shape: 1:1 clip polygon + class + rotation. */
function stickerShapeSpec(rand: () => number): { clip: string; shapeClass: string; rotation: number; points: StickerShapeData["points"] } {
    const shape = rand() < 0.5 ? "star" : "burst";
    const triangles = shape === "star" ? 5 : 8 + Math.floor(rand() * 9);
    const { points } = stickerShape(triangles);
    const clip = points.map(p =>
        `${(50 + p.cos * p.radius * 50).toFixed(2)}% ${(50 + p.sin * p.radius * 50).toFixed(2)}%`,
    ).join(", ");
    return {
        clip,
        shapeClass: `artwork-sticker-${shape}`,
        rotation: Math.round(rand() * 28 - 14),
        points,
    };
}

/**
 * Rough corner position (sticker center as fraction of the artwork size).
 * Small seeded jitter keeps it organic; `inset` is the center padding used on
 * disc formats so the whole rotated sticker lands on the visible surface.
 */
function stickerCornerPosition(rand: () => number, artSize: number, corner: "topRight" | "bottomRight", inset: number): { x: number; y: number } {
    const half = (artSize * 0.1467) / 2;
    const margin = half * 1.4;
    const jitter = () => (rand() * 2 - 1) * artSize * 0.015;
    const cx = artSize - margin + jitter();
    const padY = Math.max(margin + artSize * 0.01, inset * artSize);
    const cy = corner === "topRight"
        ? padY + jitter()
        : artSize - padY + jitter();
    return { x: cx / artSize, y: cy / artSize };
}

/** Stack a second sticker along the same edge (below/above an anchor). */
function stickerStacked(rand: () => number, artSize: number, anchor: { x: number; y: number }, direction: "up" | "down"): { x: number; y: number } {
    const offset = artSize * (0.1467 + 0.02);
    const x = anchor.x * artSize + (rand() * 2 - 1) * artSize * 0.008;
    const y = anchor.y * artSize + (direction === "up" ? -offset : offset);
    return { x: x / artSize, y: y / artSize };
}

function stickerText(text: HtmlPropertyValue): AnyElement {
    return create("span").classes("artwork-sticker-text").text(text).build();
}

/** The element returned by `artworkSticker`; keeps the shape data used to adjust its clip. */
export interface ArtworkStickerElement extends HTMLElement {
    __artworkStickerShape?: StickerShapeData;
    __artworkStickerRect?: boolean;
    __artworkStickerSize?: number;
    __artworkStickerRotation?: number;
    __artworkStickerObserver?: ResizeObserver;
}

interface StickerShapeData {
    /** Unit points (radius relative to half-box, 1 = tip). */
    points: { cos: number; sin: number; radius: number }[];
}

/** Star or burst ("circle/rectangle with a triangle-shaped edge") with a dynamic triangle count. */
function stickerShape(triangles: number): StickerShapeData {
    const points = [];
    const innerRadius = triangles === 5 ? 0.7 : 0.64;
    const total = triangles * 2;
    for (let i = 0; i < total; i++) {
        const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
        const radius = i % 2 === 0 ? 1 : innerRadius;
        points.push({ cos: Math.cos(angle), sin: Math.sin(angle), radius });
    }
    return { points };
}

/** Distance (0..) from the center to the shape boundary along a direction. */
function boundaryDistance(points: StickerShapeData["points"], angle: number): number {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let min = Infinity;
    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        const ex = b.cos * b.radius - a.cos * a.radius;
        const ey = b.sin * b.radius - a.sin * a.radius;
        const cross = dx * ey - dy * ex;
        if (cross === 0) {
            continue;
        }
        const s = (a.cos * a.radius * ey - a.sin * a.radius * ex) / cross;
        const t = (a.cos * a.radius * dy - a.sin * a.radius * dx) / cross;
        if (s > 0 && t >= 0 && t <= 1) {
            min = Math.min(min, s);
        }
    }
    return min === Infinity ? 1 : min;
}

/**
 * Fits the content into the fixed-size sticker: the whole content (icon +
 * text) is uniformly scaled so it stays inside the shape's safe area with
 * padding derived from the polygon geometry. Icon-only stickers can grow,
 * wide content like check + translated text shrinks to fit.
 */
function fitSticker(shell: HTMLElement) {
    const sticker = shell as ArtworkStickerElement;
    if (sticker.__artworkStickerRect) {
        fitRectSticker(shell);
        return;
    }
    const data = sticker.__artworkStickerShape;
    const content = shell.querySelector<HTMLElement>(".artwork-sticker-content");
    if (!data || !content || !shell.isConnected) {
        return;
    }
    const size = shell.offsetWidth;
    const contentW = content.scrollWidth;
    const contentH = content.scrollHeight;
    if (!size || !contentW || !contentH) {
        return;
    }
    const corner = Math.atan2(contentH, contentW);
    const boundary = boundaryDistance(data.points, corner);
    const magnitude = Math.sqrt((contentW / size) ** 2 + (contentH / size) ** 2);
    const scale = Math.min(1.6, (0.65 * boundary) / magnitude);
    content.style.transform = `scale(${scale.toFixed(3)})`;
    clampStickerToArtwork(shell);
}

/**
 * Sizes a plain rounded rectangle sticker to its content so the text is
 * always fully visible with a small padding; only shrinks (with a uniform
 * scale) when the content exceeds the artwork-safe limits.
 */
function fitRectSticker(shell: HTMLElement) {
    const content = shell.querySelector<HTMLElement>(".artwork-sticker-content");
    if (!content || !shell.isConnected) {
        return;
    }
    const contentW = content.scrollWidth;
    const contentH = content.scrollHeight;
    if (!contentW || !contentH) {
        return;
    }
    const artSize = parseFloat(getComputedStyle(shell).getPropertyValue("--artwork-size")) || 200;
    const maxW = artSize * 0.55;
    const maxH = artSize * 0.3;
    const scale = Math.min(1, (maxW * 0.88) / contentW, (maxH * 0.88) / contentH);
    const factor = (shell as ArtworkStickerElement).__artworkStickerSize ?? 1;
    const fittedW = contentW * scale * factor;
    const fittedH = contentH * scale * factor;
    // Content occupies 88% of the shell (padding on all sides).
    shell.style.width = `${(fittedW / 0.88).toFixed(2)}px`;
    shell.style.height = `${(fittedH / 0.88).toFixed(2)}px`;
    const appliedScale = scale * factor;
    if (appliedScale < 1) {
        content.style.transform = `scale(${appliedScale.toFixed(3)})`;
    } else {
        content.style.transform = "";
    }
    clampStickerToArtwork(shell);
}

/**
 * Keeps the sticker's rotated bounding box fully inside the artwork with a
 * small padding. On CD cases the visible surface starts below the box top and
 * ends before it on the sides/bottom, so the clamp respects those insets.
 */
function clampStickerToArtwork(shell: HTMLElement) {
    const art = shell.closest<HTMLElement>(".artwork");
    const rotation = (shell as ArtworkStickerElement).__artworkStickerRotation ?? 0;
    const w = shell.offsetWidth;
    const h = shell.offsetHeight;
    if (!art || !w || !h) {
        return;
    }
    const artSize = art.clientWidth;
    if (!artSize) {
        return;
    }
    const isCd = art.classList.contains("artwork-format-cd");
    const insetTop = isCd ? 0.125 : 0;
    const insetBottom = isCd ? 0.125 : 0;
    const insetSide = isCd ? 0.045 : 0;
    const pad = artSize * 0.01;
    const radians = (rotation * Math.PI) / 180;
    const bboxW = Math.abs(w * Math.cos(radians)) + Math.abs(h * Math.sin(radians));
    const bboxH = Math.abs(w * Math.sin(radians)) + Math.abs(h * Math.cos(radians));
    let cx = (parseFloat(shell.style.left) / 100) * artSize;
    let cy = (parseFloat(shell.style.top) / 100) * artSize;
    cx = Math.min(Math.max(cx, artSize * insetSide + bboxW / 2 + pad), artSize * (1 - insetSide) - bboxW / 2 - pad);
    cy = Math.min(Math.max(cy, artSize * insetTop + bboxH / 2 + pad), artSize * (1 - insetBottom) - bboxH / 2 - pad);
    shell.style.left = `${((cx / artSize) * 100).toFixed(2)}%`;
    shell.style.top = `${((cy / artSize) * 100).toFixed(2)}%`;
}

function fitStickerWhenReady(shell: HTMLElement) {
    const content = shell.querySelector<HTMLElement>(".artwork-sticker-content");
    if (!content) {
        return;
    }
    const observer = new ResizeObserver(() => {
        requestAnimationFrame(() => fitSticker(shell));
    });
    observer.observe(content);
    observer.observe(shell);
    requestAnimationFrame(() => fitSticker(shell));
    const sticker = shell as ArtworkStickerElement;
    sticker.__artworkStickerObserver = observer;
}

function artworkSignature(text: string | null, rand: () => number): AnyElement {
    if (text) {
        return create("div")
            .classes("artwork-signature", "artwork-signature-text")
            .children(create("span").text(text).build())
            .build();
    }

    return create("div")
        .classes("artwork-signature")
        .children(
            create("svg")
                .attributes("viewBox", "0 0 100 40")
                .children(
                    create("path")
                        .attributes(
                            "d", signaturePath(rand),
                            "fill", "none",
                            "stroke", "currentColor",
                            "stroke-width", "2.4",
                            "stroke-linecap", "round",
                            "stroke-linejoin", "round",
                        ).build(),
                ).build(),
        ).build();
}

/** Random squiggle that reads as an artist-made signature. */
function signaturePath(rand: () => number): string {
    let d = "";
    const strokes = 2 + Math.floor(rand() * 2);
    for (let s = 0; s < strokes; s++) {
        const startY = 16 + rand() * 12;
        let x = 6 + rand() * 8;
        d += `M${x.toFixed(1)} ${startY.toFixed(1)}`;
        const segments = 3 + Math.floor(rand() * 4);
        for (let i = 0; i < segments; i++) {
            const endX = Math.min(x + (88 / segments) * (0.7 + rand() * 0.6), 94);
            const endY = Math.min(Math.max(startY + (rand() * 20 - 10), 4), 36);
            const ctrlX = (x + endX) / 2;
            const ctrlY = startY + (rand() * 24 - 12);
            d += ` Q${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
            x = endX;
        }
    }
    return d;
}

/** Deterministic PRNG so sticker shapes/signature stay stable for the same artwork. */
function urlValue(url: StringOrSignal): string {
    return typeof url === "string" ? url : (url as Signal<string>).value;
}

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashString(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function toBooleanSignal(value: TypeOrSignal<boolean> | undefined): Signal<boolean> {
    if (isSignal(value)) {
        return value as Signal<boolean>;
    }
    return signal(Boolean(value));
}

function toNumberSignal(value: TypeOrSignal<number> | undefined): Signal<number | null> {
    if (isSignal(value)) {
        return value as Signal<number | null>;
    }
    return signal(value ?? null) as Signal<number | null>;
}
