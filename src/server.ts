import {file, serve} from "bun";
import {baseHtml} from "./lib/baseHtml";
import {config} from "dotenv";
import * as path from "path";
import {MIME_TYPES} from "./MIME_TYPES.ts";

config({
    quiet: true,
});

console.log(process.cwd());

const outDir = path.join(process.cwd(), "out");
const uiDir = path.join(process.cwd(), "src/ui");

const getMimeType = (filepath: string): string => {
    const getFileExtension = (path: string): string =>
        path.split('.').pop()?.toLowerCase() || "";
    const extension = getFileExtension(filepath);
    return MIME_TYPES[extension] || "text/plain";
};

// Bun server handler
const server = serve({
    port: parseInt(process.env.PORT || "3000"),
    async fetch(req) {
        const url = new URL(req.url);
        const pathname = url.pathname;

        // Handle static files from "out" and "src/ui" directories
        const staticFiles = [outDir, uiDir];
        for (const dir of staticFiles) {
            const staticFilePath = path.join(dir, pathname.slice(1)); // Remove leading "/"

            if (await Bun.file(staticFilePath).exists()) {
                const mimeType = getMimeType(staticFilePath);

                const isDefaultImage = pathname.startsWith("/img/defaults/");
                const isJs = pathname.endsWith(".js");
                const isCss = pathname.endsWith(".css");

                let cacheControl: string;
                if (isJs || isCss) {
                    cacheControl = "no-cache";
                } else if (isDefaultImage) {
                    cacheControl = "public, max-age=86400";
                } else {
                    cacheControl = "public, max-age=3600";
                }

                return new Response(await file(staticFilePath).arrayBuffer(), {
                    headers: {
                        "Content-Type": mimeType,
                        "Cache-Control": cacheControl,
                    },
                });
            }
        }

        if (pathname === "/.well-known/apple-app-site-association") {
            // Only declare entity routes here so iOS only offers to open the
            // app for links the app can actually handle. Other paths (e.g.
            // /settings, /admin) stay on the web.
            const entityPrefixes = ["/track/", "/album/", "/playlist/", "/profile/", "/user/"];
            const components = entityPrefixes.map(p => ({ "/": p, comment: `Open ${p}* in the app` }));
            const association = {
                applinks: {
                    apps: [],
                    details: [
                        {
                            appIDs: ["H3GTX7P884.com.targoninc.lyda"],
                            components,
                        },
                    ],
                },
                webcredentials: {
                    apps: ["H3GTX7P884.com.targoninc.lyda"],
                },
            };
            return new Response(JSON.stringify(association, null, 2), {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "public, max-age=3600",
                },
            });
        }

        if (pathname === "/.well-known/assetlinks.json") {
            const assetLinks = [
                {
                    relation: ["delegate_permission/common.handle_all_urls"],
                    target: {
                        namespace: "android_app",
                        package_name: "com.targoninc.lyda",
                        sha256_cert_fingerprints: [
                            "REPLACE_WITH_REAL_SHA256_FINGERPRINT_OF_ANDROID_APP_SIGNING_CERT",
                        ],
                    },
                },
            ];
            return new Response(JSON.stringify(assetLinks, null, 2), {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "public, max-age=3600",
                },
            });
        }

        if (pathname === "/api-url") {
            const apiUrl = process.env.API_URL ?? "https://api.lyda.app";
            return new Response(apiUrl, { headers: { "Content-Type": "text/plain" } });
        }

        // Handle dynamic routes (fallback to baseHtml render)
        try {
            const html = await baseHtml(req);
            return new Response(html, { headers: { "Content-Type": "text/html" } });
        } catch (error) {
            console.error("Error rendering HTML:", error);
            return new Response("Internal Server Error", { status: 500 });
        }
    },
});

console.log(`Server is running on http://localhost:${server.port}`);