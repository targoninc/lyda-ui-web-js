import { ClientError } from "@targoninc/lyda-shared/src/Models/db/lyda/ClientError";
import { Api } from "../../Api/Api.ts";
import { currentUser } from "../../state.ts";

async function handleError(msg: string, url: string, line: number, col: number, error: Error) {
    if (!currentUser.value) {
        return;
    }

    await Api.trackClientError(<ClientError>{
        message: msg,
        url: url,
        line: line,
        column: col,
        error: error,
    });
}

export function initializeGlobalErrorHandler() {
    window.addEventListener("error", async err => {
        await handleError(err.message, err.filename, err.lineno, err.colno, err.error);
    });
}