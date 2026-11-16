const { app, BrowserWindow, Menu, protocol, shell } = require("electron");
const { spawn } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");

const DIST = path.resolve(__dirname, "..", "dist");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

function registerAppProtocol() {
  protocol.registerFileProtocol("app", (request, callback) => {
    try {
      const url = new URL(request.url);
      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      if (!rel || rel === ".") rel = "index.html";
      const root = DIST.endsWith(path.sep) ? DIST : DIST + path.sep;
      const filePath = path.resolve(DIST, rel);
      if (filePath !== DIST && filePath.indexOf(root) !== 0) return callback({ error: -10 });
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return callback({ path: path.join(DIST, "index.html") });
      }
      callback({ path: filePath });
    } catch (error) {
      callback({ error: -2 });
    }
  });
}

const VOLUME_PS1 = [
  "Add-Type -TypeDefinition @'",
  "using System;",
  "using System.Runtime.InteropServices;",
  "[Guid(\"5CDF2C82-841E-4546-9722-0CF74078229A\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]",
  "interface IAudioEndpointVolume {",
  "  int a(); int b(); int c(); int d();",
  "  int SetMasterVolumeLevelScalar(float level, Guid ctx);",
  "  int e();",
  "  int GetMasterVolumeLevelScalar(out float level);",
  "  int f(); int g(); int h(); int i();",
  "  int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, Guid ctx);",
  "  int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);",
  "}",
  "[Guid(\"D666063F-1587-4E43-81F1-B948E807363F\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]",
  "interface IMMDevice {",
  "  int Activate(ref Guid id, int cls, IntPtr unused, out IAudioEndpointVolume volume);",
  "}",
  "[Guid(\"A95664D2-9614-4F35-A746-DE8DB63617E6\"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]",
  "interface IMMDeviceEnumerator {",
  "  int a();",
  "  int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice device);",
  "}",
  "[ComImport, Guid(\"BCDE0395-E52F-467C-8E3D-C4579291692E\")] class MMDeviceEnumerator { }",
  "public class Room {",
  "  public static void Max() {",
  "    var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumerator();",
  "    IMMDevice device;",
  "    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 0, out device));",
  "    IAudioEndpointVolume volume;",
  "    var id = typeof(IAudioEndpointVolume).GUID;",
  "    Marshal.ThrowExceptionForHR(device.Activate(ref id, 23, IntPtr.Zero, out volume));",
  "    var ctx = Guid.Empty;",
  "    Marshal.ThrowExceptionForHR(volume.SetMute(false, ctx));",
  "    Marshal.ThrowExceptionForHR(volume.SetMasterVolumeLevelScalar(1f, ctx));",
  "  }",
  "}",
  "'@",
  "[Room]::Max()",
  "",
].join("\r\n");

function setSystemVolumeMax() {
  const file = path.join(os.tmpdir(), "phonetic-learn-max-volume.ps1");
  try {
    fs.writeFileSync(file, VOLUME_PS1, "utf8");
  } catch (error) {
    return;
  }
  const child = spawn(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", file],
    { windowsHide: true },
  );
  child.on("error", () => {});
}

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 960,
    minHeight: 680,
    title: "音标学习",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL("app://local/index.html");
  win.once("ready-to-show", () => {
    win.webContents.setAudioMuted(false);
    setSystemVolumeMax();
    win.show();
  });

  win.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "F11") {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
    if (input.type === "keyDown" && input.key === "Escape" && win.isFullScreen()) {
      win.setFullScreen(false);
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http") || url.startsWith("mailto:")) shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("mailto:")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    // 老显卡或远程桌面黑屏时，打开下一行。
    // app.disableHardwareAcceleration();
    Menu.setApplicationMenu(null);
    registerAppProtocol();
    createWindow();
  });

  app.on("window-all-closed", () => app.quit());
}
