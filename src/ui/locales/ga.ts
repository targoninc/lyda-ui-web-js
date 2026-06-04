import { Translation } from "./index.ts";

export const ga: Translation = {
    REPORT: "Tuarascáil",
    REPORTED: "Tuairiscithe",
    REPORT_COMMENT: "Tuairiscigh trácht",
    REASON: "Cúis",
    REPORT_DESCRIPTION_PLACEHOLDER: "Déan cur síos ar an bhfadhb...",
    MAX_2048_CHARACTERS: "Uasmhéid 2048 carachtar",
    COMMENT_REPORTED: "Trácht tuairiscithe",
    HAS_REPORTS: "Tá tuairiscí",
    REPORTS_COUNT: (count: number) => `${count} tuairisc${count === 1 ? "" : "í"}`,
    REPORTS_FOR_COMMENT: "Tuairiscí don trácht",
    REPORT_REASON: (reason: string) => `Cúis: ${reason}`,
};
