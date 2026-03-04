const { app, BrowserWindow } = require("electron")
const path = require("path")
const fs = require("fs")
const { pathToFileURL } = require("url")

/* --------------------------------------------------
   Safe Paths
-------------------------------------------------- */

app.setPath("userData", path.join(app.getPath("appData"), "StreamFlow"))
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache")
app.commandLine.appendSwitch("disable-http-cache")

/* --------------------------------------------------
   Globals
-------------------------------------------------- */

let mainWindow = null
let backend = null

/* --------------------------------------------------
   Binary Paths
-------------------------------------------------- */

function getBinaryPaths() {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, "ffmpeg")
    : path.join(__dirname, "../ffmpeg")

  const map = {
    win32: {
      ffmpeg: path.join(base, "win",  "ffmpeg.exe"),
      ffprobe: path.join(base, "win",  "ffprobe.exe")
    },
    darwin: {
      ffmpeg: path.join(base, "mac", "ffmpeg"),
      ffprobe: path.join(base, "mac", "ffprobe")
    },
    linux: {
      ffmpeg: path.join(base, "linux", "ffmpeg"),
      ffprobe: path.join(base, "linux",   "ffprobe")
    }
  }

  const binaries = map[process.platform]

  if (!binaries) throw new Error("Unsupported platform")

  if (!fs.existsSync(binaries.ffmpeg))
    throw new Error("FFmpeg missing")

  if (!fs.existsSync(binaries.ffprobe))
    throw new Error("FFprobe missing")

  return binaries
}

/* --------------------------------------------------
   Backend Embedded
-------------------------------------------------- */

async function startBackend() {
  const binaries = getBinaryPaths()

  const backendModule = await import(
  pathToFileURL(
    path.join(__dirname, "../streamer/server.js")
  ).href
)

  backendModule.start({
    ffmpegPath: binaries.ffmpeg,
    ffprobePath: binaries.ffprobe
  })

  backend = backendModule
}

function stopBackend() {
  if (backend && backend.stop) {
    backend.stop()
  }
}

/* --------------------------------------------------
   Window
-------------------------------------------------- */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const url = "http://localhost:9090"

  mainWindow.loadURL(url)

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
  })

  mainWindow.webContents.on("did-fail-load", (_, code, desc) => {
    console.error("UI failed to load:", code, desc)
  })
}

/* --------------------------------------------------
   App Lifecycle
-------------------------------------------------- */

app.whenReady().then(async () => {
  try {
    await startBackend()

    // wait for backend to start
    setTimeout(() => {
      createWindow()
    }, 1500)

  } catch (err) {
    console.error("Startup failure:", err)
    app.quit()
  }
})

app.on("before-quit", () => {
  stopBackend()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})