import {Request} from "express";
import {MediaFileType} from "../ui/js/Enums/MediaFileType.ts";

export async function baseHtml(req: Request) {
    const url = req.url;

    const title = "Lyda";
    const description = "Stream the music you love.";
    let image = "https://lyda.app/img/lyda_banner.png";

    async function getImageOrDefault(url: string, defaultImage: string) {
        try {
            const res = await fetch(url);
            if (res.status === 200) {
                return url;
            } else {
                return defaultImage;
            }
        } catch {
            return defaultImage;
        }
    }

    let id, newimage;
    const apiUrl = process.env.API_URL ?? "https://api.lyda.app";
    if (url.includes("/track/")) {
        id = url.split("/")[4];
        newimage = `${apiUrl}/media/image?id=${id}&mediaFileType=${MediaFileType.trackCover}&quality=100`;
        image = await getImageOrDefault(newimage, image);
    } else if (url.includes("/album/")) {
        id = url.split("/")[4];
        newimage = `${apiUrl}/media/image?id=${id}&mediaFileType=${MediaFileType.albumCover}&quality=100`;
        image = await getImageOrDefault(newimage, image);
    } else if (url.includes("/playlist/")) {
        id = url.split("/")[4];
        newimage = `${apiUrl}/media/image?id=${id}&mediaFileType=${MediaFileType.playlistCover}&quality=100`;
        image = await getImageOrDefault(newimage, image);
    }

    const uniqid = Math.random().toString(36).substring(7);
    image = `${image}?_=${uniqid}`;

    return `<!DOCTYPE html>
<html lang="en">
<head id="header">
    <title>${title}</title>

    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${description}">
    <meta name="theme-color" content="#202025">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <link rel="stylesheet" type="text/css" href="/fjsc/fjs-components.css"/>
    <link rel="stylesheet" type="text/css" href="/styles/style.css"/>
    <link rel="stylesheet" type="text/css" href="/styles/elements.css"/>
    <link rel="stylesheet" type="text/css" href="/styles/dark.css"/>
    <link rel="stylesheet" type="text/css" href="/styles/shared_targon.css"/>
    <link rel="apple-touch-icon" href="/img/icons/favicon_128.png">
    <link rel="icon" href="/img/icons/favicon_128.png" sizes="128x128">
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:site" content="@streamlyda"/>
    <meta name="twitter:creator" content="@streamlyda"/>
    <meta name="twitter:description" content="${description}"/>
    <meta name="twitter:title" content="${title}"/>
    <meta name="twitter:image" content="${image}"/>

    <meta property="og:type" content="website"/>
    <meta property="og:title" content="${title}"/>
    <meta property="og:description" content="${description}"/>
    <meta property="og:image" content="${image}"/>
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