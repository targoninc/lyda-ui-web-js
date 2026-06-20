import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";

const cssCacheBuster = Date.now();

export async function baseHtml(req: Request) {
    const url = req.url;

    let title = "Lyda";
    let description = "Stream the music you love.";
    let image = "https://lyda.app/img/lyda_banner.png";
    const apiUrl = process.env.API_URL ?? "https://api.lyda.app";
    let ogType = "website";

    let id, newimage, res, type, optionalTags = "";
    if (url.includes("/track/")) {
        id = url.split("/").at(-1);
        newimage = `${apiUrl}/media/image?id=${id}&mediaFileType=${MediaFileType.trackCover}&quality=500`;
        type = "track";
        ogType = "music.song";
    } else if (url.includes("/album/")) {
        id = url.split("/").at(-1);
        newimage = `${apiUrl}/media/image?id=${id}&mediaFileType=${MediaFileType.albumCover}&quality=500`;
        type = "album";
        ogType = "music.album";
    } else if (url.includes("/playlist/")) {
        id = url.split("/").at(-1);
        newimage = `${apiUrl}/media/image?id=${id}&mediaFileType=${MediaFileType.playlistCover}&quality=500`;
        type = "playlist";
        ogType = "music.playlist";
    }

    if (newimage) {
        newimage = encodeURI(newimage);
        res = await fetch(`${apiUrl}/${type}s/byId?id=${id}`);
        if (res?.ok && type) {
            const body: Record<string, any> = await res.json();
            let entity = body[type];
            if (entity) {
                title = entity.user?.displayname + " - " + entity.title;
                description = entity.description ?? description;
                const profileTag = `<meta property="og:music:profile:username" content="${entity.user.username}">`;

                switch (type) {
                    case "track":
                        entity = entity as Track;
                        optionalTags = `<meta property="og:music:duration" content="${entity.length}">`
                        break;
                    case "album":
                        entity = entity as Album;
                        optionalTags = `<meta property="og:music:release_date" content="${entity.release_date}">`
                        break;
                }
                optionalTags += profileTag;
            }
        }
    }

    const uniqid = Math.random().toString(36).substring(7);
    image += `?_=${uniqid}`;
    newimage += `&_=${uniqid}`;

    const baseImage = `<meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1080" />
    <meta property="og:image:height" content="720" />`;

    return `<!DOCTYPE html>
<html lang="en">
<head id="header">    
    <meta charset="utf-8">
    <!-- Preconnects -->
    <link rel="preconnect" href="${apiUrl}" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    
    <!-- Styles -->
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/targoninc/jess-components@0.0.48/src/src/jess-components.css"/>
    <link rel="stylesheet" type="text/css" href="/styles/style.css?v=${cssCacheBuster}"/>
    <link rel="stylesheet" type="text/css" href="/styles/elements.css?v=${cssCacheBuster}"/>
    <link rel="stylesheet" type="text/css" href="/styles/themes/dark.css?v=${cssCacheBuster}"/>
    
    <!-- icon -->
    <meta property="og:logo" content="/img/128.png"/>
    <link rel="apple-touch-icon" href="/img/128.png"/>
    <link rel="apple-touch-icon" href="/img/512.png" sizes="512x512">
    <link rel="icon" sizes="128x128" href="/img/128.png"/>
    
    <!-- PWA -->
    <link rel="manifest" href="/manifest.webmanifest">
    <script>
        if ("serviceWorker" in navigator) {
            // It doesn't support PWAs anyway, so don't bother loading the service worker
            if (!navigator.userAgent.toLowerCase().includes("firefox")) {
                window.addEventListener("load", () => {
                    navigator.serviceWorker.register("/sw.js").catch(() => {});
                });
            }
        }
    </script>

    <!--
        App-link handoff for external arrivals.

        When the user opens a lyda.app URL from somewhere outside the site
        itself (messenger, email, share sheet, etc.) on a mobile device, and
        the URL is something the app can deep-link into, we:

          1. On Android, immediately navigate to an intent:// URL. The OS
             will switch to the app if installed or open the same web URL
             as a fallback (tagged with ?inapp=1 to avoid loops).

          2. On iOS, do nothing in JS - the OS handles Universal Links
             automatically via the apple-app-site-association. If the user
             has previously chosen "Open in browser" for this domain, iOS
             will not show the prompt and the web page stays visible.

          3. Show an inline "Open in app" banner at the top of the page on
             every external-link arrival. The banner is a one-tap override
             for iOS's per-domain "always open in browser" preference: it
             fires lyda:// (iOS) or intent:// (Android) when tapped, which
             forces the OS to switch to the app.

        This is intentionally minimal: no banner on desktop, no banner for
        in-site navigation (referrer is the site itself), no auto-skip or
        memory of previous dismissals. The user always gets the choice; the
        worst case is the no-op web page they were already on.
    -->
    <script>
        (function() {
            try {
                const params = new URLSearchParams(window.location.search);
                if (params.get("inapp") === "1") return;
                const path = window.location.pathname;
                const prefixes = ["/track/", "/album/", "/playlist/", "/profile/", "/user/"];
                const isEntity = prefixes.some(function(p) {
                    return path === p.slice(0, -1) || path.indexOf(p) === 0;
                });
                if (!isEntity) return;
                const ua = navigator.userAgent;
                const isAndroid = /Android/i.test(ua);
                const isIOS = /iPhone|iPad|iPod/i.test(ua);
                if (!isAndroid && !isIOS) return;
                const ref = document.referrer;
                if (ref) {
                    try {
                        if (new URL(ref).origin === window.location.origin) return;
                    } catch (e) { /* fall through */ }
                }

                // 1) Android: try the intent:// immediately. The page
                //    unloads as the OS hands off, so the banner we add
                //    below will never become visible on Android.
                if (isAndroid) {
                    const u = new URL(window.location.href);
                    const fallback = new URL(u.toString());
                    fallback.searchParams.set("inapp", "1");
                    const intent = "intent://lyda.app" + u.pathname + u.search +
                        "#Intent;scheme=https;package=com.targoninc.lyda;" +
                        "S.browser_fallback_url=" + encodeURIComponent(fallback.toString()) + ";end";
                    window.location.replace(intent);
                }

                // 2) On iOS, set a flag so the JESS app can render
                //    the inline banner using its normal component flow.
                if (isIOS) {
                    window.__showAppBanner = true;
                }
            } catch (e) { /* swallow — never break the page */ }
        })();
    </script>

    <!-- Other -->
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${description}">
    <meta name="theme-color" content="#202025">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta property="og:url" content="${url}"/>
    <meta property="og:type" content="${ogType}"/>
    <meta property="og:title" content="${title}"/>
    <meta property="og:description" content="${description}"/>
    ${optionalTags ?? ""}
    <meta property="og:image" content="${newimage}" />
    <meta property="og:image:width" content="500" />
    <meta property="og:image:height" content="500" />
    ${newimage ? "" : baseImage}
    <script src="/main.js?v=${cssCacheBuster}" type="module"></script>
</head>
<body>
<div class="page-background">
    <div class="page-container"></div>
</div>

<footer class="flex-v"></footer>

<div class="notifications flex-v"></div>
</body>
</html>`;
}