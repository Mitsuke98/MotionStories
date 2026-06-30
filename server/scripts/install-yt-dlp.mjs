#!/usr/bin/env node
// Downloads the yt-dlp standalone Linux binary at build time on Railway
import https from "https";
import fs from "fs";
import { execSync } from "child_process";

const dest = "/usr/local/bin/yt-dlp";

// Skip if already installed
try {
  execSync(`${dest} --version`, { stdio: "ignore" });
  console.log("yt-dlp already installed, skipping.");
  process.exit(0);
} catch {}

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, destPath).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
      file.on("error", reject);
    }).on("error", reject);
  });
}

console.log("Downloading yt-dlp...");
await download("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux", dest);
fs.chmodSync(dest, 0o755);
const version = execSync(`${dest} --version`).toString().trim();
console.log(`yt-dlp ${version} installed at ${dest}`);
