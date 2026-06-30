#!/usr/bin/env node
import https from "https";
import fs from "fs";
import { execSync } from "child_process";

const dest = "/usr/local/bin/yt-dlp";

try {
  execSync(`${dest} --version`, { stdio: "ignore" });
  console.log("yt-dlp already present.");
  process.exit(0);
} catch {}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
      file.on("error", reject);
      res.on("error", reject);
    }).on("error", reject);
  });
}

console.log("Downloading yt-dlp...");
await download("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux");
fs.chmodSync(dest, 0o755);
const version = execSync(`${dest} --version`).toString().trim();
console.log(`yt-dlp ${version} ready at ${dest}`);
