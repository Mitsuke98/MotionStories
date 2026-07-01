#!/usr/bin/env node
import https from "https";
import fs from "fs";
import { execSync } from "child_process";

const dest = "/usr/local/bin/ffmpeg";

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

// Download ffmpeg static build for Linux amd64
const url = "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64";
console.log("Downloading ffmpeg static binary...");
await download(url);
fs.chmodSync(dest, 0o755);
const version = execSync(`${dest} -version 2>&1 | head -1`).toString().trim();
console.log(`ffmpeg ready: ${version}`);
