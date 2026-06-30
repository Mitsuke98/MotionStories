#!/bin/sh
set -e

echo "==> Installing yt-dlp..."
node scripts/download-ytdlp.mjs

echo "==> Running migrations..."
node dist/db/migrate.js

echo "==> Starting server..."
exec node dist/index.js
