#!/bin/sh
set -e

# Download yt-dlp standalone binary if not present
YTDLP_BIN=/usr/local/bin/yt-dlp
if [ ! -f "$YTDLP_BIN" ]; then
  echo "Downloading yt-dlp..."
  node -e "
const https = require('https');
const fs = require('fs');
function get(url, dest) {
  https.get(url, res => {
    if (res.statusCode === 301 || res.statusCode === 302) { get(res.headers.location, dest); return; }
    const file = fs.createWriteStream(dest);
    res.pipe(file);
    file.on('finish', () => { file.close(); console.log('yt-dlp downloaded'); });
  }).on('error', e => { console.error('download failed', e); process.exit(1); });
}
get('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux', '/usr/local/bin/yt-dlp');
"
  chmod +x "$YTDLP_BIN"
  echo "yt-dlp ready"
else
  echo "yt-dlp already present"
fi

# Run DB migrations
echo "Running migrations..."
node dist/db/migrate.js

# Start server
echo "Starting server..."
exec node dist/index.js
