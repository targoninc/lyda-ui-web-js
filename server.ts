import express from "express";
import {baseHtml} from "./lib/baseHtml";
import {config} from "dotenv";
import path from "path";

config();

console.log(process.cwd());

const app = express();
app.use(express.static(path.join(process.cwd(), "ui")));

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
