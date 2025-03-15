// copy version from package.json to src/ui/js/Classes/Helpers/version.txt
import fs from "fs";

const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));
const version = packageJson.version;
const versionFilePath = "./src/ui/js/Classes/Helpers/version.txt";
fs.writeFileSync(versionFilePath, version);

console.log("Version copied to " + versionFilePath);
