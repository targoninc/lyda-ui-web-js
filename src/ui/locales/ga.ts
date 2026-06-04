import { Translation } from "./index.ts";

export const ga: Translation = {
    REPORT: "Tuarascáil",
    REPORTED: "Tuairiscithe",
    REPORT_COMMENT: "Tuairiscigh trácht",
    REASON: "Cúis",
    DESCRIPTION: "Cur síos",
    REASON_SPAM: "Tuarascáil",
    REASON_BULLYING: "Bulaíocht",
    REASON_SEXUAL_CONTENT: "Ábhar Gnéasach",
    REASON_ABUSE: "Mí-úsáid",
    REASON_HATESPEECH: "Fuathchainteanna",
    REASON_HEAVY_SWEARING: "Mionnú Trom",
    REASON_OTHER: "Eile",
    REPORT_DESCRIPTION_PLACEHOLDER: "Déan cur síos ar an bhfadhb...",
    MAX_2048_CHARACTERS: "Uasmhéid 2048 carachtar",
    COMMENT_REPORTED: "Trácht tuairiscithe",
    HAS_REPORTS: "Tá tuairiscí",
    REPORTS_COUNT: (count: number) => `${count} tuairisc${count === 1 ? "" : "í"}`,
    REPORTS_FOR_COMMENT: "Tuairiscí don trácht",
    REPORT_REASON: (reason: string) => `Cúis: ${reason}`,
};
