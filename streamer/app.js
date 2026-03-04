import path from "path"
import { fileURLToPath } from "url"
import { start, stop } from "./server.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/*
   Resolve FFmpeg paths for direct Node usage
*/

const ffmpegBase = path.join(__dirname, "../ffmpeg")

const binaries = {
  win32: {
    ffmpeg: path.join(ffmpegBase, "win","ffmpeg.exe"),
    ffprobe: path.join(ffmpegBase, "win","ffprobe.exe")
  },
  darwin: {
    ffmpeg: path.join(ffmpegBase, "mac", "ffmpeg"),
    ffprobe: path.join(ffmpegBase, "mac", "ffprobe")
  },
  linux: {
    ffmpeg: path.join(ffmpegBase, "linux",  "ffmpeg"),
    ffprobe: path.join(ffmpegBase, "linux", "ffprobe")
  }
}

const platform = process.platform
const paths = binaries[platform]

if (!paths) {
  throw new Error(`Unsupported platform: ${platform}`)
}

/*
   Start backend
*/

await start({
  ffmpegPath: paths.ffmpeg,
  ffprobePath: paths.ffprobe
})

/*
   Graceful shutdown
*/

process.on("SIGINT", () => {
  console.log("\n[server] SIGINT received")
  stop()
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("\n[server] SIGTERM received")
  stop()
  process.exit(0)
})