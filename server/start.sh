#!/bin/sh
set -e

# Download yt-dlp standalone binary if not present
if [ ! -f /usr/local/bin/yt-dlp ]; then
  echo "==> Downloading yt-dlp..."
  node -e "
const https = require('https'), fs = require('fs');
function get(url, dest) {
  https.get(url, res => {
    if (res.statusCode === 301 || res.statusCode === 302) { get(res.headers.location, dest); return; }
    const file = fs.createWriteStream(dest);
    res.pipe(file);
    file.on('finish', () => { file.close(); console.log('yt-dlp done'); });
  }).on('error', e => { console.error(e); process.exit(1); });
}
get('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux', '/usr/local/bin/yt-dlp');
" && sleep 3
  chmod +x /usr/local/bin/yt-dlp
fi

# Download ffmpeg static binary if not present
if [ ! -f /usr/local/bin/ffmpeg ]; then
  echo "==> Downloading ffmpeg..."
  node scripts/download-ffmpeg.mjs
fi

echo "==> Running migrations..."
node dist/db/migrate.js

echo "==> Starting server..."
exec node dist/index.js
