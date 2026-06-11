export class ColorExtractor {
    private static cache = new Map<string, string>();

    static async extract(imageUrl: string): Promise<string | null> {
        if (!imageUrl || imageUrl.includes("/defaults/")) {
            console.log("[ColorExtractor] skipped (default/no url)", imageUrl?.substring(0, 80));
            return null;
        }

        const cached = this.cache.get(imageUrl);
        if (cached) {
            console.log("[ColorExtractor] cache hit", cached);
            return cached;
        }

        try {
            const color = await this.extractDominant(imageUrl);
            console.log("[ColorExtractor] extracted", color, "from", imageUrl.substring(0, 80));
            if (color) {
                this.cache.set(imageUrl, color);
            }
            return color;
        } catch (e) {
            console.error("[ColorExtractor] error", e);
            return null;
        }
    }

    static clearCache() {
        this.cache.clear();
    }

    private static extractDominant(imageUrl: string): Promise<string | null> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const color = this.sampleFromImage(img);
                resolve(color);
            };
            img.onerror = () => {
                resolve(null);
            };
            img.src = imageUrl;
        });
    }

    private static sampleFromImage(img: HTMLImageElement): string | null {
        const canvas = document.createElement("canvas");
        const size = 50;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        ctx.drawImage(img, 0, 0, size, size);

        const margin = Math.floor(size * 0.2);
        const sw = size - margin * 2;
        const imageData = ctx.getImageData(margin, margin, sw, sw);
        const pixels = imageData.data;

        const buckets = new Map<number, { count: number; satSum: number }>();
        const SAT_THRESHOLD = 0.2;

        for (let y = 0; y < sw; y++) {
            for (let x = 0; x < sw; x++) {
                const i = (y * sw + x) * 4;
                const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
                if (a < 128) continue;

                const [h, s, l] = this.rgbToHsl(r, g, b);
                if (l < 0.05 || l > 0.95) continue;

                const cx = sw / 2, cy = sw / 2;
                const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                const maxDist = Math.sqrt(cx * cx + cy * cy);
                const weight = Math.max(0.1, 1 - (dist / maxDist) * 0.6);

                const bucket = Math.round(h / 15) * 15;
                if (s > SAT_THRESHOLD) {
                    const entry = buckets.get(bucket) ?? { count: 0, satSum: 0 };
                    entry.count += weight;
                    entry.satSum += s * weight;
                    buckets.set(bucket, entry);
                }
            }
        }

        if (buckets.size === 0) return null;

        let bestBucket = -1;
        let bestScore = 0;
        for (const [bucket, entry] of buckets) {
            const avgSat = entry.satSum / entry.count;
            const score = entry.count * (1 + avgSat * 4);
            if (score > bestScore) {
                bestScore = score;
                bestBucket = bucket;
            }
        }

        if (bestBucket === -1) return null;

        return this.hslToHex(bestBucket, 0.3, 0.45);
    }

    private static rgbToHsl(r: number, g: number, b: number): [number, number, number] {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return [h * 360, s, l];
    }

    static getThemeColors(themeColor: string): { text: string; bg: string; accent: string } | null {
        const parseRgb = (s: string): [number, number, number] => {
            const m = s.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : [0, 0, 0];
        };
        const resolveVar = (name: string): string | null => {
            const el = document.createElement("div");
            el.style.setProperty("--x", `var(${name})`);
            el.style.background = "var(--x)";
            document.body.appendChild(el);
            const c = getComputedStyle(el).backgroundColor;
            el.remove();
            return c || null;
        };

        let bg0 = resolveVar("--bg-0");
        if (!bg0) return null;

        let [r1, g1, b1] = parseRgb(bg0);
        // also resolve themeColor from hex to rgb for mixing
        const parseHex = (h: string): [number, number, number] => {
            let hex = h.trim();
            if (hex.startsWith("#")) hex = hex.slice(1);
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
        };
        const toHex = (r: number, g: number, b: number): string =>
            "#" + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, "0")).join("");
        const mix = (c1: string, t: number): string => {
            const [r2, g2, b2] = parseHex(c1);
            return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
        };

        const [tr, tg, tb] = parseHex(themeColor);
        const [h, s] = this.rgbToHsl(tr, tg, tb);

        return {
            text: this.hslToHex(h, s, 0.65),
            bg: mix(themeColor, 0.4),
            accent: mix(themeColor, 0.6),
        };
    }

    private static hslToHex(h: number, s: number, l: number): string {
        h /= 360;
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + h * 12) % 12;
            return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        };
        return "#" + [
            Math.round(f(0) * 255).toString(16).padStart(2, "0"),
            Math.round(f(8) * 255).toString(16).padStart(2, "0"),
            Math.round(f(4) * 255).toString(16).padStart(2, "0"),
        ].join("");
    }
}
