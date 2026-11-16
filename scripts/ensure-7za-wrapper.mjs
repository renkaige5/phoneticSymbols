import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "scripts", "7za-tolerant.cs");
const outDir = path.join(root, "scripts", "bin");
const wrapper = path.join(outDir, "7za.exe");
const csc = path.join(
  process.env.WINDIR || "C:\\Windows",
  "Microsoft.NET",
  "Framework64",
  "v4.0.30319",
  "csc.exe"
);

fs.mkdirSync(outDir, { recursive: true });
const compiled = spawnSync(csc, ["/nologo", "/optimize", `/out:${wrapper}`, source], {
  stdio: "inherit",
});
if (compiled.status !== 0) {
  process.exit(compiled.status || 1);
}

const target = path.join(root, "node_modules", "builder-util", "out", "7za.js");
const original = `async function getPath7za() {
    await (0, fs_extra_1.chmod)(_7zip_bin_1.path7za, 0o755);
    return _7zip_bin_1.path7za;
}`;
const patched = `async function getPath7za() {
    if (process.env.ELECTRON_BUILDER_7ZA) {
        return process.env.ELECTRON_BUILDER_7ZA;
    }
    await (0, fs_extra_1.chmod)(_7zip_bin_1.path7za, 0o755);
    return _7zip_bin_1.path7za;
}`;
const text = fs.readFileSync(target, "utf8");
if (!text.includes("ELECTRON_BUILDER_7ZA")) {
  if (!text.includes(original)) {
    throw new Error("builder-util 7za.js layout changed; cannot install symlink workaround");
  }
  fs.writeFileSync(target, text.replace(original, patched));
}

// app-builder.exe can download these archives, but Windows denies its rename of
// the unpacked directory. Prepare the cache with Node so packaging finds it ready.
const mirror = "https://npmmirror.com/mirrors/electron-builder-binaries/";
const cacheRoot = path.join(root, ".cache", "electron-builder");
fs.mkdirSync(path.join(root, ".cache", "tmp"), { recursive: true });
const real7za = path.join(root, "node_modules", "7zip-bin", "win", "x64", "7za.exe");
// app-builder stores nsis-resources beside NSIS, under the nsis cache folder.
const tools = [
  { group: "winCodeSign", version: "2.6.0" },
  { group: "nsis", version: "3.0.4.1" },
  { group: "nsis", name: "nsis-resources", version: "3.4.1" },
];

async function download(url, dest) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`download failed ${response.status} ${url}`);
  }
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(dest));
}

for (const tool of tools) {
  const name = tool.name || tool.group;
  const version = tool.version;
  const dirName = `${name}-${version}`;
  const finalDir = path.join(cacheRoot, tool.group, dirName);
  if (fs.existsSync(finalDir) && fs.readdirSync(finalDir).length > 0) {
    continue;
  }
  const stageDir = path.join(cacheRoot, tool.group);
  fs.mkdirSync(stageDir, { recursive: true });
  const archive = path.join(stageDir, `${dirName}.7z`);
  const url = `${mirror}${dirName}/${dirName}.7z`;
  console.log(`prefetch ${dirName}`);
  await download(url, archive);
  const tempDir = path.join(stageDir, `unpack-${dirName}`);
  fs.rmSync(tempDir, { recursive: true, force: true });
  const extracted = spawnSync(real7za, ["x", "-bd", "-y", archive, `-o${tempDir}`], {
    stdio: "inherit",
  });
  const unpacked = fs.existsSync(tempDir) && fs.readdirSync(tempDir).length > 0;
  if (!unpacked || (extracted.status !== 0 && extracted.status !== 2)) {
    throw new Error(`failed to unpack ${dirName}`);
  }
  fs.rmSync(finalDir, { recursive: true, force: true });
  // Node and app-builder are denied this rename; PowerShell is allowed.
  const moved = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Move-Item -LiteralPath '${tempDir.replace(/'/g, "''")}' -Destination '${finalDir.replace(/'/g, "''")}'`,
    ],
    { stdio: "inherit" }
  );
  if (moved.status !== 0 || !fs.existsSync(finalDir)) {
    throw new Error(`failed to move unpacked ${dirName} into place`);
  }
}
