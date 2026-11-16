# 音标学习

离线音标软件。48 个音标：44 个音素，加上教材单列的 tr、dr、ts、dz。声音打包在软件里。

课程按「字母的名字和声音 → 拼读 → 音标」排，共 14 节，也可以直接打开任意一课。顺序对照人教版七年级上册。音标录音参考[新东方国际音标卡片](https://www.xdf.cn/zhuanti/bd-phonetic-alphabet-card/index.html)。

程序代码以 [MIT 协议](LICENSE) 开源：<https://github.com/renkaige5/phoneticSymbols>

字体、新东方录音和用 Piper 合成的例词各自保留原来的许可，见文末「第三方」。

## 内容

- **课程**：字母（一）（二）（三）是 A 到 Z 的字母名和单词里的常见读音；「拼一拼」把几个音连成词；其余各课按发音特点列出 48 个音，带例词和口型说明。讲完的课会记在这台电脑上。
- **音标表**：按音查。tr、dr、ts、dz 标在辅音下面，是两个辅音连读。可搜单词或中文，例如 ship、船。
- **易混**：成对的音和例词，两个音会先后播放。
- **课堂大字 / 全屏 / 循环 3 遍**：大字号、全屏（或 F11）、一个音连放三遍。例词有正常速度和慢速。
- **关于**：版本和许可。本机记录可在这里清除。

## 打开

**安装包。** 双击后选一个文件夹，一路下一步，不需要管理员密码。桌面会出现「音标学习」。安装版会把这台电脑的音量调到最大。

支持 Windows 7 SP1、Windows 10、Windows 11。安装包大约几十到一百兆，断网也能装。安装包用 Electron 22，不依赖 WebView2。

**单文件。** 把「音标学习.html」拷到 U 盘或任意文件夹，用 Chrome、Edge 或 360 浏览器（极速模式）打开。声音和字体都在这一个文件里。Windows 7 上用 IE 打开会白屏。单文件版不改系统音量。

## 没声音

1. 看功放、音箱开关和音量。安装版会把电脑音量调到最大。
2. 弹出「这个声音没有播出来」时，先查音响和播放文件。单词的声音已经打包在软件里。
3. 还是没有：退出全屏，看电脑音量图标是不是静音。第一次播放可能稍慢，浏览器要解码音频。

## 开发

需要 Node.js 22。

```powershell
npm install
npm run dev
```

浏览器打开后进入课程列表。

### 教室安装包

```powershell
npm run dist:win
```

产物在 `release\音标学习-0.1.0-安装包.exe`。32 位 Windows 7 再执行 `npm run dist:win32`。

第一次打包需要联网下载 Electron。GitHub 慢时，可以先执行：

```powershell
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
npm install
```

老显卡黑屏时，打开 `electron/main.cjs` 里的 `app.disableHardwareAcceleration()`。

`src-tauri/` 是原来的 Tauri 工程，适合 Windows 10 / 11，图标也放在这里。教室里还有 Windows 7 时，用 Electron 安装包。

### 离线单文件

```powershell
npm run build:single
```

产物是 `dist-单文件\音标学习.html`。`dist/`、`dist-单文件/`、`release/` 都是打包生成的，不放进仓库。

## 第三方

软件离线运行，不需要账号，也不收集信息。

**字体。** Charis SIL，SIL Open Font License 1.1。许可证原文在 `public/fonts/OFL.txt`，随软件一起分发。版权：Copyright (c) 1997-2023 SIL International。保留字体名 Charis 和 SIL。可以自由使用、修改、再分发，不得单独出售字体本身。全文：<https://openfontlicense.org/open-font-license-official-text/>

**音频。** 音素、字母名和例词的声音都打包在软件里。

- 48 个音标的录音来自[新东方国际音标卡片](https://www.xdf.cn/zhuanti/bd-phonetic-alphabet-card/index.html)。26 个字母名的录音来自[新东方 26 个英文字母表](https://www.xdf.cn/zhuanti/bd_letter_card/index.html)。
- 例词用 [Piper TTS](https://github.com/rhasspy/piper)（GPL-3.0）合成，模型是 en_GB-cori-medium（英式女声 Cori），模型卡为 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。Piper 只在制作例词时使用，软件里没有 Piper 程序。
- 录音和例词做过首尾静音裁切、淡入淡出，并整体提升后限幅。

**运行环境。** 教室安装包使用 Electron 22。只用 Windows 10 / 11 时，还可以走 Tauri 2 和 `@tauri-apps/plugin-sql`（MIT / Apache-2.0）。单文件版不含这些。

例词以人教版七年级上册常见词为主。程序代码可以自由使用、修改和分发；字体和录音仍按各自的许可使用。
