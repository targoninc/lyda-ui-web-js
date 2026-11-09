import {create, signal, StringOrSignal} from "@targoninc/jess";
import {button} from "@targoninc/jess-components";
import {t} from "../../locales";
import {Api} from "../Api/Api.ts";
import {ReportTarget} from "../Models/ReportTarget.ts";
import {createModal, notify} from "../Classes/Ui.ts";
import {Util} from "../Classes/Util.ts";

export class ReportTemplates {
    static reasonOptions() {
        return [
            {value: "spam", label: t("REASON_SPAM")},
            {value: "bullying", label: t("REASON_BULLYING")},
            {value: "sexual_content", label: t("REASON_SEXUAL_CONTENT")},
            {value: "abuse", label: t("REASON_ABUSE")},
            {value: "hatespeech", label: t("REASON_HATESPEECH")},
            {value: "heavy_swearing", label: t("REASON_HEAVY_SWEARING")},
            {value: "advertising", label: t("REASON_ADVERTISING")},
            {value: "bot", label: t("REASON_BOT")},
            {value: "doxxing", label: t("REASON_DOXXING")},
            {value: "fake_news", label: t("REASON_FAKE_NEWS")},
            {value: "ai_generated", label: t("REASON_AI_GENERATED")},
            {value: "other", label: t("REASON_OTHER")},
        ];
    }

    static open(target: ReportTarget, contentTitle: StringOrSignal) {
        const reason = signal("spam");
        const description = signal("");
        const modalId = `report-${target.entityType}-${target.entityId}-${target.mediaType ?? "track"}`;

        const modalContents = [
            create("h2").text(contentTitle).build(),
            create("div").classes("flex-v").children(
                create("label").text(t("REASON")).build(),
                create("select")
                    .children(...ReportTemplates.reasonOptions().map(option =>
                        create("option").value(option.value).text(option.label).build()))
                    .onchange((e: Event) => {
                        reason.value = (e.target as HTMLSelectElement).value;
                    })
                    .build(),
            ).build(),
            create("div").classes("flex-v").children(
                create("label").text(t("DESCRIPTION")).build(),
                create("textarea")
                    .attributes("maxlength", "2048")
                    .placeholder(t("REPORT_DESCRIPTION_PLACEHOLDER"))
                    .onchange((e: Event) => description.value = (e.target as HTMLTextAreaElement).value)
                    .build(),
                create("span").classes("color-dim").text(t("MAX_2048_CHARACTERS")).build(),
            ).build(),
            create("div").classes("flex", "align-children").children(
                button({
                    text: t("REPORT"),
                    icon: {icon: "flag"},
                    classes: ["positive"],
                    onclick: async () => {
                        await Api.reportContent(target.entityType, target.entityId, reason.value, description.value, target.mediaType);
                        Util.removeModal(modal);
                        notify(target.entityType === "track" ? t("TRACK_REPORTED") : t("MEDIA_REPORTED"));
                    },
                }),
                button({
                    text: t("CANCEL"),
                    icon: {icon: "close"},
                    classes: ["negative"],
                    onclick: () => Util.removeModal(modal),
                }),
            ).build(),
        ];

        const modal = createModal(modalContents, modalId);
        modal?.querySelector("select")?.focus();
    }
}
