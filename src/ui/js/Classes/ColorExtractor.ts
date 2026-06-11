export class ColorExtractor {
    private static cache = new Map<string, string>();

    static async extract(imageUrl: string): Promise<string | null> {
        const cached = this.cache.get(imageUrl);
        if (cached) return cached;

        const color = await this.extractDominant(imageUrl);
        if (color) {
            this.cache.set(imageUrl, color);
        }
        return color;
    }

    static clearCache() {
        this.cache.clear();
    }

    private static async extractDominant(imageUrl: string): Promise<string | null> {
        try {
            const blob = await fetch(imageUrl, { credentials: "include" }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.blob();
            });
            const objectUrl = URL.createObjectURL(blob);

            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const color = this.sampleFromImage(img);
                    URL.revokeObjectURL(objectUrl);
                    resolve(color);
                };
                img.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    resolve(null);
                };
                img.src = objectUrl;
            });
        } catch (e) {
            console.warn("ColorExtractor: failed to load image", imageUrl, e);
            return null;
        }
    }

    private static sampleFromImage(img: HTMLImageElement): string | null {
        const canvas = document.createElement("canvas");
        const size = 50;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data;

        const saturated = new Map<string, number>();
        const all = new Map<string, number>();

        const cx = size / 2, cy = size / 2;
        const maxDist = Math.sqrt(cx * cx + cy * cy);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = (y * size + x) * 4;
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];

                if (a < 128) continue;

                const [h, s, l] = this.rgbToHsl(r, g, b);
                if (l < 0.08 || l > 0.92) continue;

                const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                const weight = Math.max(0, 1 - (dist / maxDist) * 0.8);

                const q = (v: number) => Math.min(248, Math.round(v / 32) * 32);
                const hex = this.rgbToHex(q(r), q(g), q(b));

                all.set(hex, (all.get(hex) ?? 0) + weight);
                if (s > 0.15) {
                    saturated.set(hex, (saturated.get(hex) ?? 0) + weight);
                }
            }
        }

        if (all.size === 0) return null;

        let bestHex = "";
        let bestCount = 0;
        const pool = saturated.size > 0 ? saturated : all;
        for (const [hex, count] of pool) {
            if (count > bestCount) {
                bestCount = count;
                bestHex = hex;
            }
        }

        const [r, g, b] = this.hexToRgb(bestHex);
        let [h, s, l] = this.rgbToHsl(r, g, b);

        if (s < 0.15 && this.chroma(r, g, b) > 10) {
            s = 0.35;
        }

        s = Math.min(s * 1.5, 0.7);
        l = 0.35 + l * 0.35;

        return this.hslToHex(h, s, l);
    }

    private static chroma(r: number, g: number, b: number): number {
        return Math.max(r, g, b) - Math.min(r, g, b);
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

    private static hslToHex(h: number, s: number, l: number): string {
        h /= 360;
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + h * 12) % 12;
            return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        };
        return this.rgbToHex(
            Math.round(f(0) * 255),
            Math.round(f(8) * 255),
            Math.round(f(4) * 255),
        );
    }

    private static rgbToHex(r: number, g: number, b: number): string {
        return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
    }

    private static hexToRgb(hex: string): [number, number, number] {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return [0, 0, 0];
        return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
    }
}
