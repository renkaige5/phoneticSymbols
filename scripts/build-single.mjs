/**
 * 打包「单文件离线版」：把 JS、CSS、字体、全部 mp3 塞进一个 HTML。
 * 产物：dist-单文件/音标学习.html —— 拷到任意 Win7–Win11 电脑，双击即可用，无需联网、无需安装。
 *
 * 用法：node scripts/build-single.mjs
 */
import { build } from "esbuild";
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { phonemes, letters, blendWords, pairs } from "../src/data.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audioDir = path.join(root, "public", "audio");
const outDir = path.join(root, "dist-单文件");

const slug = (word) =>
  String(word).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

/* ---------- 1. 检查音频完整性：数据里用到的每个音，都必须有文件 ---------- */
const files = (await readdir(audioDir)).filter((name) => name.endsWith(".mp3"));
const names = new Set(files.map((name) => name.slice(0, -4)));
const need = new Set();

phonemes.forEach((item) => need.add(item.id));
letters.forEach((item) => need.add("l-" + item.letter));
blendWords.forEach((item) => {
  need.add("w-" + slug(item.word));
  need.add("w-" + slug(item.word) + "-slow");
});
phonemes.forEach((item) =>
  (item.examples || []).forEach((example) => {
    need.add("w-" + slug(example.word));
    need.add("w-" + slug(example.word) + "-slow");
  }),
);
letters.forEach((item) => {
  if (!item.example) return;
  need.add("w-" + slug(item.example.word));
  need.add("w-" + slug(item.example.word) + "-slow");
});
pairs.forEach((pair) => {
  ["left", "right"].forEach((side) => {
    if (pair[side] && pair[side].word) need.add("w-" + slug(pair[side].word));
  });
});

const missing = [...need].filter((name) => !names.has(name));
if (missing.length) {
  console.error("缺少音频文件（" + missing.length + " 个）：");
  console.error(missing.join("\n"));
  process.exit(1);
}
console.log("音频检查通过：" + need.size + " 个引用，全部有 mp3；目录内共 " + names.size + " 个。");

/* ---------- 2. 打包 JS（ES2015，兼容老浏览器） ---------- */
const result = await build({
  entryPoints: [path.join(root, "src", "main.js")],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2015",
  minify: true,
  charset: "utf8",
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
const js = result.outputFiles[0].text;

/* ---------- 3. CSS + 字体内嵌 ---------- */
const fontBase64 = (await readFile(path.join(root, "public", "fonts", "CharisSIL-Regular.ttf"))).toString("base64");
const fontUrl = "data:font/ttf;base64," + fontBase64;
let css = await readFile(path.join(root, "src", "styles.css"), "utf8");
css = css.replace(/url\((["']?)\/fonts\/CharisSIL-Regular\.ttf\1\)/g, 'url("' + fontUrl + '")');

/* ---------- 4. 音频 base64 映射（key 与 speech.js 的 url(name) 一致） ---------- */
const audio = {};
for (const name of names) {
  const data = await readFile(path.join(audioDir, name + ".mp3"));
  audio[name] = "data:audio/mpeg;base64," + data.toString("base64");
}
const audioJson = JSON.stringify(audio);

/* ---------- 5. 拼成单文件 ---------- */
const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>音标学习 · 离线版</title>
<style>
${css}
</style>
</head>
<body>
<div id="app"><p style="max-width:720px;margin:60px auto;text-align:center;color:#6d6355;">正在打开音标学习，请稍等…</p></div>
<noscript><p style="text-align:center">你的浏览器禁用了 JavaScript，请换用 Chrome 或 360 浏览器（极速模式）。</p></noscript>
<script>window.__AUDIO__ = ${audioJson};</script>
<script>${js}</script>
</body>
</html>
`;

await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, "音标学习.html");
await writeFile(outFile, html, "utf8");

const size = (await stat(outFile)).size;
console.log("已生成：" + outFile);
console.log("大小：" + (size / 1024 / 1024).toFixed(2) + " MB（音频 " + names.size + " 段已内置）");
