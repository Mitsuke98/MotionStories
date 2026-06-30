import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

function getFfmpegPath(): string {
  // Resolved at runtime from the imageio-ffmpeg-style static binary, or
  // system ffmpeg if FFMPEG_PATH is unset (falls back to PATH lookup).
  return process.env.FFMPEG_PATH || "ffmpeg";
}

const MAX_FRAMES = Number(process.env.MAX_FRAMES_PER_VIDEO || 20);

export interface ExtractedFrame {
  seqIndex: number;
  timestampSec: number;
  filePath: string;
}

async function detectSceneCutTimestamps(videoPath: string): Promise<number[]> {
  const { stderr } = await execFileAsync(getFfmpegPath(), [
    "-i",
    videoPath,
    "-vf",
    "select='gt(scene,0.25)',showinfo",
    "-vsync",
    "vfr",
    "-f",
    "null",
    "-",
  ]).catch((e) => ({ stderr: e.stderr as string, stdout: "" }));
  const matches = [...stderr.matchAll(/pts_time:([0-9.]+)/g)];
  return matches.map((m) => parseFloat(m[1]));
}

/**
 * Extracts frames either at detected scene cuts, or falls back to 1fps
 * sampling when the video is a single continuous shot (e.g. product
 * montages with only camera movement, no hard cuts) — validated manually
 * against a GoPro product video before this pipeline was built.
 */
export async function extractFrames(
  videoPath: string,
  outDir: string
): Promise<ExtractedFrame[]> {
  await fs.mkdir(outDir, { recursive: true });

  const sceneCuts = await detectSceneCutTimestamps(videoPath);

  if (sceneCuts.length >= 2) {
    const timestamps = sceneCuts.slice(0, MAX_FRAMES);
    const frames: ExtractedFrame[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const filePath = path.join(outDir, `frame_${String(i + 1).padStart(2, "0")}.png`);
      await execFileAsync(getFfmpegPath(), [
        "-ss",
        String(timestamps[i]),
        "-i",
        videoPath,
        "-frames:v",
        "1",
        filePath,
        "-y",
      ]);
      frames.push({ seqIndex: i + 1, timestampSec: Math.round(timestamps[i]), filePath });
    }
    return frames;
  }

  // Fallback: fixed 1fps sampling, capped at MAX_FRAMES.
  const pattern = path.join(outDir, "frame_%02d.png");
  await execFileAsync(getFfmpegPath(), [
    "-i",
    videoPath,
    "-vf",
    `fps=1`,
    "-frames:v",
    String(MAX_FRAMES),
    pattern,
    "-y",
  ]);
  const files = (await fs.readdir(outDir)).filter((f) => f.endsWith(".png")).sort();
  return files.map((f, i) => ({
    seqIndex: i + 1,
    timestampSec: i,
    filePath: path.join(outDir, f),
  }));
}
