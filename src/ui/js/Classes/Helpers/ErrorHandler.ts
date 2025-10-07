import { Api } from "../../Api/Api.ts";
import { ClientError } from "@targoninc/lyda-shared/dist/Models/db/lyda/ClientError";

export function initializeGlobalErrorHandler() {
    window.onerror = async (msg, url, line, col, error) => {
        await Api.trackClientError(<ClientError>{
            message: msg,
            url: url,
            line: line,
            column: col,
            error: error,
        });
    };
}