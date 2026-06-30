import path from "node:path";
import fs from "node:fs/promises";
import YTDlpWrap from "yt-dlp-wrap";

export async function downloadFromUrl(url: string, outDir: string): Promise<string> {
  await fs.mkdir(outDir, { recursive: true });
  const ytDlpWrap = new (YTDlpWrap as any).default(process.env.YTDLP_PATH || "yt-dlp");
  const outPath = path.join(outDir, "source.mp4");
  try {
    await ytDlpWrap.execPromise([
      url,
      "-f",
      "mp4/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best",
      "-o",
      outPath,
    ]);
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes("ENOENT")) {
      throw new Error(
        "yt-dlp is not installed or not found at YTDLP_PATH. Install it (e.g. `pip install yt-dlp` or `brew install yt-dlp`) or set YTDLP_PATH in server/.env."
      );
    }
    throw new Error(`Failed to download video from URL: ${msg}`);
  }
  return outPath;
}

export async function saveUploadedFile(
  buffer: Buffer,
  outDir: string,
  originalName: string
): Promise<string> {
  await fs.mkdir(outDir, { recursive: true });
  const ext = path.extname(originalName) || ".mp4";
  const outPath = path.join(outDir, `source${ext}`);
  await fs.writeFile(outPath, buffer);
  return outPath;
}
