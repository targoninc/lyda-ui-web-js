import {Request} from "express";

export function dechex(id: string) {
    return parseInt(id, 16);
}

export async function baseHtml(req: Request) {
    const url = req.url;

    const title = "Lyda";
    const description = "Stream the music you love.";
    let image = "https://lyda.app/img/lyda_banner.png";

    async function getImageOrDefault(url: string, defaultImage: string) {
        const res = await fetch(url);
        if (res.status === 200) {
            return url;
        } else {
            return defaultImage;
        }
    }

    let id, newimage;
    if (url.includes("/track/")) {
        id = url.split("/")[4];
        newimage = `https://api.lyda.app/storage/v2/covers/tracks/${dechex(id)}.webp`;
        image = await getImageOrDefault(newimage, image);
    } else if (url.includes("/album/")) {
        id = url.split("/")[4];
        newimage = `https://api.lyda.app/storage/v2/covers/albums/${dechex(id)}.webp`;
        image = await getImageOrDefault(newimage, image);
    } else if (url.includes("/playlist/")) {
        id = url.split("/")[4];
        newimage = `https://api.lyda.app/storage/v2/covers/playlists/${dechex(id)}.webp`;
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
    <link rel="stylesheet" type="text/css" href="/style.css"/>
    <link rel="stylesheet" type="text/css" href="/elements.css"/>
    <link rel="stylesheet" type="text/css" href="/styles/dark.css"/>
    <link rel="stylesheet" type="text/css" href="/styles/shared_targon.css"/>
    <link rel="apple-touch-icon" href="/img/icons/favicon_128.png">
    <link rel="icon" href="/img/icons/favicon_128.png" sizes="128x128">
    <link rel="me" href="https://wetdry.world/@loudar">

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
</head>
<body>
<div class="page-background">
    <div class="page-container"></div>
</div>

<footer class="flex-v"></footer>

<div class="notifications flex-v"></div>
<script src="js/main.mjs" type="module"></script>
</body>
</html>`;
}