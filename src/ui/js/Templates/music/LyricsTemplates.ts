import { compute, create, nullElement, signal, Signal } from "@targoninc/jess";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { currentTrackId, currentTrackPosition } from "../../state.ts";
import { PlayManager } from "../../Streaming/PlayManager.ts";

interface TimedLine {
    time: number;
    text: string;
}

export class LyricsTemplates {
    static lyricsView(track: Track, fullPage = false) {
        if (track.lyrics_plain_text) {
            return LyricsTemplates.#plainLyrics(track.lyrics_plain_text, fullPage);
        }

        if (track.lyrics_timed_file && track.lyrics_timed_format) {
            const lines = LyricsTemplates.#parseTimed(track.lyrics_timed_file, track.lyrics_timed_format);
            if (lines.length > 0) {
                return LyricsTemplates.#timedLyrics(lines, track, fullPage);
            }
        }

        return nullElement();
    }

    static #scrollClass(fullPage: boolean) {
        return fullPage ? "lyrics-full" : "lyrics-scroll";
    }

    static #plainLyrics(text: string, fullPage = false) {
        return create("div")
            .classes("lyrics-container", LyricsTemplates.#scrollClass(fullPage), "flex-v")
            .children(
                create("div")
                    .classes("lyrics-content", "flex-v")
                    .children(
                        ...text.split("\n").map(line =>
                            create("div")
                                .classes("lyrics-line", "lyrics-line-static")
                                .text(line || "\u00A0")
                                .build(),
                        ),
                    ).build(),
            ).build();
    }

    static #timedLyrics(lines: TimedLine[], track: Track, fullPage = false) {
        if (lines.length === 0) {
            return nullElement();
        }

        const lineRefs: HTMLElement[] = [];
        const activeIndex = signal(-1);

        const currentLine = compute(
            (pos) => {
                const abs = pos?.absolute ?? 0;
                let idx = -1;
                for (let i = lines.length - 1; i >= 0; i--) {
                    if (abs >= lines[i].time) {
                        idx = i;
                        break;
                    }
                }
                return idx;
            },
            currentTrackPosition,
        );

        currentLine.subscribe((idx) => {
            if (idx < 0 || idx >= lineRefs.length) return;
            if (activeIndex.value === idx) return;
            activeIndex.value = idx;
            lineRefs.forEach((el, i) => {
                el.classList.toggle("active", i === idx);
                el.classList.toggle("past", i < idx);
            });
            const el = lineRefs[idx];
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });

        const container = create("div")
            .classes("lyrics-container", LyricsTemplates.#scrollClass(fullPage), "flex-v")
            .children(
                create("div")
                    .classes("lyrics-content", "flex-v")
                    .children(
                        ...lines.map(line =>
                            create("div")
                                .classes("lyrics-line", "lyrics-line-timed", "clickable")
                                .text(line.text || "\u00A0")
                                .onclick(async () => {
                                    const relative = track.length > 0 ? line.time / track.length : 0;
                                    if (currentTrackId.value !== track.id) {
                                        await PlayManager.startAsync(track.id, false);
                                    }
                                    await PlayManager.scrubTo(track.id, relative);
                                })
                                .build(),
                        ),
                    ).build(),
            ).build() as HTMLElement;

        const contentEl = container.querySelector(".lyrics-content")!;
        contentEl.querySelectorAll(".lyrics-line-timed").forEach(el => lineRefs.push(el as HTMLElement));

        return container;
    }

    static #parseTimed(content: string, format: "lrc" | "srt"): TimedLine[] {
        switch (format) {
            case "lrc":
                return LyricsTemplates.#parseLRC(content);
            case "srt":
                return LyricsTemplates.#parseSRT(content);
            default:
                return [];
        }
    }

    static #parseLRC(content: string): TimedLine[] {
        const lines: TimedLine[] = [];
        const regex = /\[(\d+):(\d+\.?\d*)\](.*)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseFloat(match[2]);
            const text = match[3].trim();
            if (text) {
                lines.push({ time: minutes * 60 + seconds, text });
            }
        }
        return lines.sort((a, b) => a.time - b.time);
    }

    static #parseSRT(content: string): TimedLine[] {
        const lines: TimedLine[] = [];
        const blocks = content.trim().split(/\n\s*\n/);
        for (const block of blocks) {
            const parts = block.split("\n");
            if (parts.length < 3) continue;
            const timeMatch = parts[1].match(
                /(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/,
            );
            if (!timeMatch) continue;
            const startSeconds =
                parseInt(timeMatch[1], 10) * 3600 +
                parseInt(timeMatch[2], 10) * 60 +
                parseInt(timeMatch[3], 10) +
                parseInt(timeMatch[4], 10) / 1000;
            const text = parts.slice(2).join(" ").trim();
            if (text) {
                lines.push({ time: startSeconds, text });
            }
        }
        return lines.sort((a, b) => a.time - b.time);
    }
}
