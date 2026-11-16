# 音标学习

给初中英语老师用的离线课堂教具。装在教室多媒体机上，全班听示范、看口型、跟着齐读。不需要麦克风，不录音，不联网。

48 个音标：44 个音素，加上教材单列的 tr、dr、ts、dz。课按「字母的名字和声音 → 拼读 → 音标」排，也可以直接点开任意一课。音标数据参考[新东方国际音标卡片](https://www.xdf.cn/zhuanti/bd-phonetic-alphabet-card/index.html)。

## 开源

程序代码以 [MIT 协议](LICENSE) 开源。谁都可以查看、修改和再分发，保留版权声明即可。

仓库：<https://github.com/renkaige5/phoneticSymbols>

字体 Charis SIL、新东方录音和 Piper 合成的例词不在这份协议里，各自保留原来的许可，见下方「第三方」。

## 老师怎么用

### 打开

1. 双击安装包，选一个文件夹，下一步到底。不需要管理员密码。
2. 桌面上会出现「音标学习」。双击打开。
3. 打开后，软件会把这台电脑的音量调到最大，里面的录音也已经开到最大。再把教室功放开到后排能听清：点「听 /f/」，再点「听 /aʊ/」。

也可以不安装。把「音标学习.html」拷到 U 盘或任意文件夹，用 Chrome、Edge 或 360 浏览器（极速模式）打开。整个软件（声音和字体）都在这一个文件里。Win7 如果被 IE 打开会白屏，不要用 IE。

### 上一节课

1. 首页是「按教材上课」。点开一课，页面上就是这节课要讲的字母和音。
2. 点「听」放示范，老师领读，全班跟着读。课上不安排闯关，也不做题。
3. 右上角点「课堂大字」，再点「全屏」（或按 F11）。投影后排就能看清。翻页笔的下一页 / 上一页对应下一步 / 上一步，空格重播。
4. 「循环 3 遍」打开后，点一个音会连放三遍。
5. 这节讲完了，点「这节讲完了」，回到目录。下一课会标出来。

教材位置写的是建议对照（人教版七上的大致顺序）。按手里的课本微调即可。

另外几个页面：

- 「音标表」：查某一个音。tr、dr、ts、dz 标在辅音下面，是两个辅音连读，不算新的音素。也能搜单词或中文，例如 ship、船。
- 「易混」：中国学生容易混的音。点一组，两个音先后响。
- 「进度」：只记这台电脑讲到第几课，不记学生姓名。「关于」或「进度」里可以「清除本机记录」。

### 没声音

1. 先看教室功放、音箱开关和音量。安装版会把电脑音量调到最大。再听 /f/，这个音最轻，后排能听见就够了。
2. 如果弹出「这个声音没有播出来」，是音响或文件的问题，不是没装英语语音。单词的声音已经在软件里。
3. 还是没有声音：退出全屏，看电脑自己的音量图标是不是静音。单文件版改不了系统音量，需要自己把音量和功放开大。第一次点「听」可能稍慢，浏览器要解码音频，再点就快了。

Win7 要先确认是 SP1。安装包大约几十到一百兆，断网也能装。

## 开发

```powershell
npm install
npm run dev
```

浏览器打开后，从「课程」进入一节课。

## 打包

教室安装包用 Electron 22（最后一个支持 Windows 7 SP1 的版本）。Win7 SP1、Win10、Win11 都能装，不依赖 WebView2，按用户安装，不需要管理员权限。

```powershell
npm run dist:win
```

产物在 `release\音标学习-0.1.0-安装包.exe`。32 位 Win7 再执行 `npm run dist:win32`。

第一次打包需要联网下载 Electron。如果 GitHub 很慢，可以先执行：

```powershell
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
npm install
```

老显卡黑屏时，打开 `electron/main.cjs` 里的 `app.disableHardwareAcceleration()`。

`src-tauri/` 是原来的 Tauri 工程，只适合 Win10 / 11，图标也放在这里。教室里还有 Win7 时，以 Electron 安装包为准。

离线单文件（一个 HTML，拷走就能用）：

```powershell
npm run build:single
```

产物是 `dist-单文件\音标学习.html`。`dist/`、`dist-单文件/`、`release/` 都是打包生成的，不放进仓库。

## 第三方

完全离线，不联网，不需要账号，不收集任何信息。

**字体。** Charis SIL，SIL Open Font License 1.1。许可证原文在 `public/fonts/OFL.txt`，会随软件一起分发。版权：Copyright (c) 1997-2023 SIL International，保留字体名 Charis 和 SIL。可以自由使用、修改、再分发，不得单独出售字体本身。全文：<https://openfontlicense.org/open-font-license-official-text/>

**音频。** 音素、字母名和例词的声音都打包在软件里，不调用 Windows 系统语音。

- 48 个音标的录音来自[新东方国际音标卡片](https://www.xdf.cn/zhuanti/bd-phonetic-alphabet-card/index.html)。26 个字母名的录音来自[新东方 26 个英文字母表](https://www.xdf.cn/zhuanti/bd_letter_card/index.html)。
- 例词用 [Piper TTS](https://github.com/rhasspy/piper)（GPL-3.0）合成，模型是 en_GB-cori-medium（英式女声 Cori），模型卡为 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。Piper 只在制作例词时使用，软件里没有 Piper 程序。
- 录音和例词都做过首尾静音裁切、淡入淡出，并整体提升后限幅，方便大教室后排听清。

**运行环境。** 教室安装包使用 Electron 22。只用 Windows 10 / 11 时，还可以走 Tauri 2 和 `@tauri-apps/plugin-sql`（MIT / Apache-2.0）。单文件版不含这些。

例词以人教版初中英语七年级上册常见词为主，只作教学示例。

程序代码可自由使用、修改和分发。第三方字体和录音不随 MIT 协议放开。
