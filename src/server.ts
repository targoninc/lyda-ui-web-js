import express from "express";
import {baseHtml} from "./lib/baseHtml";
import {config} from "dotenv";
import * as path from "node:path";

config();

console.log(process.cwd());

const app = express();
app.use(express.static(path.join(process.cwd(), "out")));
app.use(express.static(path.join(process.cwd(), "src/ui")));

app.get("/api-url", (req, res) => {
    res.send(process.env.API_URL ?? "https://api.lyda.app");
});

app.get("*foo", async (req, res) => {
    baseHtml(req).then(html => res.send(html));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
