import { MediaFileType } from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";
import { Track } from "@targoninc/lyda-shared/src/Models/db/lyda/Track";
import { Album } from "@targoninc/lyda-shared/src/Models/db/lyda/Album";

export async function baseHtml(req: Request) {
    const url = req.url;

    let title = "Lyda";
    let description = "Stream the music you love.";
    let image = "https://lyda.app/img/lyda_banner.png";
    const apiUrl = process.env.API_URL ?? "https://api.lyda.app";
    let ogType = "website";

    let id, newimage, res, type, optionalTags;
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
    <link rel="stylesheet" type="text/css" href="/styles/style.css"/>
    <link rel="stylesheet" type="text/css" href="/styles/elements.css"/>
    <link rel="stylesheet" type="text/css" href="/styles/themes/dark.css"/>
    
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
    
    <!-- Other -->
    <title>${title}</title>
    <meta charset="utf-8">
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
    <script src="/main.js" type="module"></script>
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