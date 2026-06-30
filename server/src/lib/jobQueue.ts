import PQueue from "p-queue";

// Processing involves yt-dlp/ffmpeg subprocesses + sequential AI calls, so we
// run one job at a time per server instance to keep CPU/memory predictable.
export const jobQueue = new PQueue({ concurrency: 1 });
