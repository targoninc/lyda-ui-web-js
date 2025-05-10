import data from "../../../../../package.json";
import {GenericTemplates} from "../../Templates/generic/GenericTemplates.ts";

export const version: string = data.version;

export async function getVersion(): Promise<string> {
    const checkUrl = "https://lyda.app/js/Classes/Helpers/version.txt";
    try {
        const res = await fetch(checkUrl);
        if (res.status === 200) {
            return await res.text();
        }
    } catch (e) {
        console.error("Failed to fetch version from " + checkUrl);
    }
    return "unknown";
}

let newestKnownVersion = version;

export function startUpdateCheck() {
    setInterval(async () => {
        const currentVersion = await getVersion();
        if (currentVersion !== version) {
            if (currentVersion === newestKnownVersion) {
                return;
            }
            newestKnownVersion = currentVersion;
            const existingVersion = document.querySelector(".update-available");
            if (existingVersion) {
                existingVersion.remove();
            }
            document.body.appendChild(GenericTemplates.updateAvailable(newestKnownVersion));
        }
    }, 1000 * 10);
}