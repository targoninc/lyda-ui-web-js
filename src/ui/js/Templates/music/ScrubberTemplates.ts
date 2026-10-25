import {compute, create, Signal} from "@targoninc/jess";
import {PlayManager} from "../../Streaming/PlayManager.ts";
import {loadingAudio} from "../../state.ts";
import {Track} from "@targoninc/lyda-shared/src/Models/db/lyda/Track";

export class ScrubberTemplates {
    static scrubbar(
        track: Track,
        bufferPercent: Signal<string>,
        positionPercent: Signal<string>,
        version?: number,
    ) {
        const disabledClass = compute((l): string => l ? "disabled" : "_", loadingAudio);

        return create("div")
            .classes("audio-player-scrubber", "flex-grow", "flex", "rounded", "padded-inline", disabledClass)
            .id(track.id)
            .onmousedown(e => PlayManager.scrubFromElement(e, track.id, version))
            .onmousemove(async e => {
                if (e.buttons === 1) {
                    await PlayManager.scrubFromElement(e, track.id, version);
                }
            })
            .on("pointerdown", async e => {
                await PlayManager.scrubFromElement(e as PointerEvent, track.id, version);
            })
            .children(
                create("div")
                    .id(track.id)
                    .classes("audio-player-buffer-indicator", "rounded", "nopointer")
                    .styles("left", bufferPercent)
                    .build(),
                create("div").classes("audio-player-scrubbar", "rounded", "nopointer").build(),
                create("div")
                    .classes("audio-player-scrubbar-time", "rounded", "nopointer")
                    .styles("width", positionPercent)
                    .build(),
                create("div")
                    .id(track.id)
                    .classes("audio-player-scrubhead", "rounded", "nopointer")
                    .styles("left", positionPercent)
                    .build(),
            ).build();
    }
}
