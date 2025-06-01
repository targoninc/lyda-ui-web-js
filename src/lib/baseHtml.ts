import {MediaFileType} from "@targoninc/lyda-shared/src/Enums/MediaFileType.ts";

export async function baseHtml(req: Request) {
    const url = req.url;

    const title = "Lyda";
    const description = "Stream the music you love.";
    let image = "https://lyda.app/img/lyda_banner.png";
    const apiUrl = process.env.API_URL ?? "https://api.lyda.app";

    let id, newimage;
    if (url.includes("/track/")) {
        id = url.split("/").at(-1);
        newimage = `${apiUrl}/media/image?id=${id}&mediaFileType=${MediaFileType.trackCover}&quality=100`;
    } else if (url.includes("/album/")) {
        id = url.split("/").at(-1);
        newimage = `${apiUrl}/media/image?id=${id}&mediaFileType=${MediaFileType.albumCover}&quality=100`;
    } else if (url.includes("/playlist/")) {
        id = url.split("/").at(-1);
        newimage = `${apiUrl}/media/image?id=${id}&mediaFileType=${MediaFileType.playlistCover}&quality=100`;
    }

    const uniqid = Math.random().toString(36).substring(7);
    image += `?_=${uniqid}`;
    newimage += `?_=${uniqid}`;

    const baseImage = `<meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1080" />
    <meta property="og:image:height" content="720" />`;

    return `<!DOCTYPE html>
<html lang="en">
<head id="header">
    <title>${title}</title>

    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${description}">
    <meta name="theme-color" content="#202025">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    
    <!-- Preconnect to API -->
    <link rel="preconnect" href="${apiUrl}" crossorigin>
    
    <!-- Preconnect to JS Delivr -->
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    
    <!-- Preconnect to Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    
    <!-- Inter -->
    <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    
    <!-- Material Symbols Filled -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/targoninc/jess-components@0.0.15/src/src/jess-components.css"/>
    
    <link rel="stylesheet" type="text/css" href="/styles/style.css"/>
    <link rel="stylesheet" type="text/css" href="/styles/elements.css"/>
    <link rel="stylesheet" type="text/css" href="/styles/dark.css"/>
    <link rel="stylesheet" type="text/css" href="/styles/shared_targon.css"/>
    
    <!-- base64 encoded favicon -->
    <link rel="apple-touch-icon" href="data:iamge/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAATjAAAE4wH8oFNoAAALL0lEQVR4nO2df4hdRxXHz66xVpolDSV2E7TZJpJCxO4+YhESJbuyrxbRdqtCi9USQWnUP4zYCCLYbcE/NBWTf7RF/wj+Qv/QbFr8w+6DbsAGCw2bVaw2aNy00FhLaZdNNcTiync6s969e9+P++acuXd+fOCxSdjc++6c78ycc+bM3IGVlRWSoNVsjBDROBGN6Q/+vl3kZuFxgYgWiegsEc3h5+Ts/KLEU7IKQBt9iogOENEo24UTYIGIjhPRDKcYWATQajbQ0w8R0R0s3yrRjVNEND05Oz9n21JWAtCGnyai/clklWAthL4E0Go2rtXDUerx9eAkpt3J2fnXyn6bwbL/odVsTGkHJRm/PsAWi9o2pSglgFazcZSIThDRpnDb0ltgkxPaRj3T0xSgh/yZNNd7A3yDqV6mhK4C0MafS2GddyBsHO8mgo5TQDK+18Bmc9qGbenmA8wk43vNqLZhW9oKQDsTac73n/2dHMNCH0CHEydib7nAuHNydn7daLBOAHrOWEyhXnAsYUEu7xQWTQHHk/GDZJO27RrWjAA6t/9k7C0VOBPZtYP8CDAde+tEwBobrwpA9/7k9YfPfm1rRXYESL0/Hg6ZJ1U+gK7k+XvsrRIZN6KyyIwApZcRE96jbG4EcCDZMzqUzQdmJ8fS8B8vNw7qku1EnIwN6tr9RJyMpxEgbtQIMBJ7K0TMyGDarhU12zeE9PTbbr2drh7eRptH38d+7TcuLdPy356ji799jP790ovs168KhIEyu0MdsmHjEO357o9oaMcuJzd99sgD9OITj9Xk6e0ovTGkjow++D1nxge7Dz9IW/ZN+NREbfFeAEM7b6LNN+9xft8d9x50fk8JvBeAxHzfCy5HHEmCmAIS/eO9AF5deKaa+/7hTCX35cZ7ASA0u/zSRef3ffmpMEong5gCnv/1z5zfMwmgRriOyV8+PRdMMigIASBLB6O4IpQkEIUUBbgyyhuvXwpm+KeQBACjwDjShNT7KbQ8gAvjYDEoJIISgLRxls+fU2FnSHi5HIyFGKSAYfCsQfBnGEkqTfvCr9aHm1gTwGokElI++gbeCABr/TD8lr3/L2F86zVD9Kcj31zzezASVusk+Ofp9Qa+4eP30IZrNtINd35K+SAQAqYiX8RQawG8/fptqofB8GjkPGpJ9sjaf4SRdhO/AC4+8bgKN7NAlNnvhT9DoPhADBACBFnnnEEtfQAM7yjw2PfT39DWWz9WaHzSDQ4jZIGRYCxuinp/p5oAMyrgGfAsVa1adqNWAjCG3/PwD3te4y8yQpGxbMBaQ35Ix+iUnY46PtfNe9Qz1VEItZgC0Ji7v/ZQX4UdMAL+f3aYhbFgtKuv38ry/YrCy60fvr3wdzthhICs5bnvH6nF1FD5CIA5HsOkTVVPkTE4cwJF4WV+6ikDRItnrkNVUWUCQCnX+x/9Je34zH3W1yoyBldOAOv++Z6KYZxjdMGzow3QFlVRiQBgMM4qXhgjP7fCaBxFG9y9Pw/aAG3Bec0yOBfAew4/pOL0dp59v0iMAgjl8g4lkj7cFcFoC7TJri8eZr1uLzgVAIyPsE6Cje9eP4zCeDYLRGqBKRf7w+GUAmEj2sglzqIANdcxp2jN0iwqgopy9KpO4Kkn+xZdkSOJ+8xNfVCNOHA+uUvSzXfNZzilcLIziLvnw/AwOj75HppHOZuP/KL0PRBG/u7TH+n6e/A94M1zCwHJLBciEB8BMK9xGv/5Ez+n8z9+pKvhDaZotKzX3mudIXL/Z776OSUEPCvXKIc2+8/ryypfIImoD4BhEvMaBzDimfs/rxqkV+Mb+ikaLbuYAyE8fd9ddO4HDzM87Zug7aS3oIkJAM4Sl1eL4fD3B+/qew9AWWPaFH1CbE8fvJutVB3TJyIPKcQEgNQuR6h3/iePqrmwbK/PAmOWKRq1XcrFtAPBojbBFrShZGQgIgDMhxxOEbZhY77noFejmmVcWyBY+AYcIkDqWGoRSUQAHDluDPuc+Xxcq5ecAOc9jQg4pgOpdQN2AXD0fqRwJUKgXozLXVcIESw88BXr66BNJUYBdgFw5LSf/Y5M/NvNuFJFn7gmfBlbJNYL2AVgG7agoaTWyU3RaDskq4oRHdhOBRIhIasAMETZev7Spd2dri+5rwBTge0mVrQt9zTALgAbXGy6bGdk3Nsm1LS5dxlqLQDbwgYXpdTtikZd7CpSR81ZhoXcq5GsArDNWLmqkcuv8RcVfUphe6IJzkHkpFZVwa6OezFFowbuKuJOSE8zZYn2kKis0Yu2fMVCrQQgueiRxxgdc3JIR7+WpVYCcFkdC6PD+K57v2RJWT+wCuDyP+x6kuvyaCw0uZz/iSGMs23jPKwCsE2j9rPbxoaiok9J0Ptt9xNwp6pZBWDrxaOcqm5DJCfv+sQ91lfjjpTYRwDbc3pCOYQ5Dxxc28UchK61HgGIIaOGYsi6bqW2QZV2Wa6TSPgr7ALg8Kql6+Bckz/ZpF8kIhZ2AXDsyYOjhJdAhAAiG46aPqxfSOQrRPIAHAUdqIBxvU2KGxgfGz9ZimOZaiPziAgASsUGDlvgD2Ak8HE64DQ+2lIqWymWCYRiOYohMXeqreQV7qEvC7x9bEfjMD7aUKr3g7fcu2N4WuLC/71yRcWs7/zoJ62v9bbN19HwxG3qmkt//iPL95MAI9V7v/FtGrn7syxXR0g9//Uv0WXBtQoxAYArr76iFMxRyzZ41VV03S17acsHPkT/emFRtFH6AfkLGH9oJ98O6L8c+xa98sxp0e8tKgAyqcuBAbbYHqMBhtjNY7coEVQpBPT44fHblJ+CqQoi5cLVuwmdvThS6nAIrOih0FNt/HCU14c/gnWL/EGRXLjaGk6u3xyKY1V3feF+sesj/4AFHvge3ClTcz7xO/ZOsB0/V4Trt5I6f3Useg12DUv0nCxwoCACiAFLqAijzM9OmKkKP7EwhaNnXLwjEN8XW99dv4+gkncHYwjFvCnZk3wC0xiSZ1UcRV9JRZDZPi1xpq9vIMmjdhFX9B6Cyt8ejqEWDmJsowHCYzh6Vb340lCL18cjnIKDaM7eDxlzwJVkdq8MtRCAIWQhlDnZzCW1EoAhJCHU1fCGWgogi9SBjNIgJ2ESVHWm9gIwqBc07JtQYqjru/tNVhLJKF82m3gjgCyYIpCRU8fRMB3d3g/w5OHF46POJa7hEN8NLwWQZzVjt/Om1QwetyjQu2Fgk2a+9NfngthSFoQA2qGEMLxNjRj5ghL83VQaqX37uUSMKnG/tNxT+thnghZAojtIBV9I7RQtFyCAxdhbIWIWIYCzsbdCxJxNAoibOQig92O0E6FxdnBydh4+wEIybXQswPamIOR47K0RIcrmRgAzsbdGhCibKwHoaeBk7C0SESe1zdfUBB6NvVUiYtXWqwKYnJ1HNHAq9paJgFPa1op8VbDoNrFELVhj4zUC0MpIvkC4nMz2fmqzL+AAES3F3lIBsqRtu4Z1ApicnX+t6BcT3nNA27azALQIECMeSzYPhmPapusYWFlpXw/SajYwX+yPvfU8B15/2zPquu0NnErrBF6zoG3Ylo4C0HPGeBKBl8Bm40Xzfpauu4MzIkhJIn841YvxqZsPkKfVbCCF+OXYWtMz4PAd6vUrlxIAvSmCKb2UuCnsdvSOJR3qlVrZLX1AhL7BSMoY1grYYqSs8amfESBLq9kY17nlFCpWA+b66Xx6twxWAjBoIWDeucOjxvMZ9PijNoY3sAjA0Go2RnTciVTyqNdNXD8WtO81Y4o5OGAVQJZWs3GtDh/xGdN+w3bPjeAK7NaCkVGyj14+10tIVxoi+h/dgwl4lNw26wAAAABJRU5ErkJggg=="/>
    <link rel="icon" sizes="128x128" href="data:iamge/png;base64,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"/>
    
    <meta property="og:type" content="website"/>
    <meta property="og:title" content="${title}"/>
    <meta property="og:description" content="${description}"/>
    <meta property="og:image" content="${newimage}" />
    <meta property="og:image:width" content="100" />
    <meta property="og:image:height" content="100" />
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