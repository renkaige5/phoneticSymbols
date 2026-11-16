/**
 * 课堂层：教师提示、口型示意图、教材对照。
 * 口型是示意图，给老师指着讲，不是解剖图。
 */

function esc(value) {
  return String(value === undefined || value === null ? "" : value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

export const CLASS_STEPS = ["复习导入", "听音", "看口型", "全班跟读", "拼读", "课堂小测"];

const STEP_TIPS = [
  ["用一两分钟问上节课的两个音或两个词。", "学生先齐答，你再点播放核对。", "如果没有上一课，就直接说出今天只做一件事。"],
  ["每个音先安静听两遍，先不要跟读。", "翻页笔的“下一页”会放到下一个音。", "后排听不清就按空格重播，或打开顶部的“循环 3 遍”。"],
  ["你先对着图做两遍，动作夸张一点。", "再让全班看着图做，你看谁的嘴不对。", "口令要短，学生跟着口令做，不要讲术语。"],
  ["你领读，全班齐读，再开火车读。", "软件只放示范，不录音、不评分。", "读错了用下面的口令纠，不要只说“不对”。"],
  ["先一个音一个音读，再连成词。", "慢一遍、正常一遍就够，不要机械拖得很慢。", "把单词写在黑板上，让学生看见字母和音的对应。"],
  ["先让全班举手或齐答，再点“揭晓答案”。", "题干上不出现音标，揭晓前也不标对错。", "错得多的音会记在“进度”里，下节课开头复习。"],
];

/** 给学生的说法、常错、纠错口令。没有单列的音，用音标数据里的 how / point。 */
const COACH = {
  ae: { say: "嘴张大，能放进一根手指", wrong: "嘴张不够，读成 /e/", avoid: "不要读成 bed 里的 e" },
  e: { say: "嘴角向两边，短短地“诶”", wrong: "张得太大，读成 /æ/", avoid: "不要滑成“爱”" },
  "i-long": { say: "嘴角拉开，把“衣”拉长", wrong: "读短，和 /ɪ/ 混", avoid: "不要读成 ship 里的短音" },
  "i-short": { say: "短而松，不要拉长", wrong: "读成汉语的“衣”", avoid: "看到 ee 不要选这个音" },
  theta: { say: "看到我的舌尖了吗？伸出来——", wrong: "读成 /s/，舌尖没伸出来", avoid: "不要读成 /s/" },
  eth: { say: "舌尖伸出来，嗓子要麻", wrong: "读成 /d/ 或 /z/", avoid: "不要读成 day 的开头" },
  v: { say: "上牙咬住下嘴唇，嗓子麻", wrong: "读成 /w/", avoid: "别把嘴唇收圆" },
  w: { say: "嘴唇先收圆，再打开", wrong: "上牙咬下唇，读成 /v/", avoid: "不要咬唇" },
  sh: { say: "嘴唇收圆，轻轻“嘘”", wrong: "读成 /s/", avoid: "不要只把舌尖往前伸" },
  zh: { say: "和“嘘”一样的嘴，嗓子麻", wrong: "读成 /z/ 或汉语“日”", avoid: "不要读成 /s/" },
  r: { say: "舌尖往后收，不要顶住", wrong: "舌尖顶住，读成 /l/", avoid: "不要顶上牙床" },
  l: { say: "舌尖顶住上牙床后面", wrong: "读成 /r/，或词尾吞掉", avoid: "词尾也要顶住" },
  "u-long": { say: "嘴唇收圆，把“乌”拉长", wrong: "读短，和 book 混", avoid: "不要读成 /ʊ/" },
  "u-short": { say: "嘴唇微圆，短短的", wrong: "拉长成 food", avoid: "不要读成 /uː/" },
  er: { say: "嘴微开，拉长“厄”，不要卷舌", wrong: "卷舌，或读得太轻", avoid: "英式不要卷舌" },
  schwa: { say: "又轻又短，一带而过", wrong: "把轻音读重了", avoid: "不重读的音节才用它" },
  ch: { say: "先堵住，再放开，像“吃”的开头", wrong: "只摩擦，读成 /ʃ/", avoid: "开头要有一个堵住" },
  dzh: { say: "先堵住再放开，嗓子麻", wrong: "读成汉语“知”或 /d/", avoid: "不要只发一个 /d/" },
  ng: { say: "气从鼻子走，后面别再加 g", wrong: "sing 后面又读了 /g/", avoid: "不要再加 /g/" },
  p: { say: "拿一张纸放嘴前，纸会动", wrong: "不送气，或词尾吞掉", avoid: "词尾也要轻轻送出来" },
  b: { say: "手摸喉咙，会麻；纸几乎不动", wrong: "送气太大，读成 /p/", avoid: "不要送大气" },
  t: { say: "舌尖顶上牙床，再弹开", wrong: "词尾吞掉", avoid: "不要读成 /d/" },
  d: { say: "和 t 一样的位置，嗓子麻", wrong: "读成 /t/", avoid: "手摸喉咙要有振动" },
  k: { say: "舌根抬起堵住，再放开", wrong: "读成 /g/ 或不送气", avoid: "纸要动" },
  g: { say: "舌根堵住，嗓子麻", wrong: "读成 /k/", avoid: "不要送大气" },
  f: { say: "上牙轻轻咬下唇，吹气", wrong: "咬太重，或读成 /w/", avoid: "嗓子不要麻" },
  s: { say: "舌尖靠近上牙床，吹气", wrong: "舌尖伸出来，读成 /θ/", avoid: "舌尖不要伸到牙齿外面" },
  z: { say: "和 s 一样，嗓子麻", wrong: "读成 /s/", avoid: "手摸喉咙要麻" },
  h: { say: "嘴自然张开，哈一口气", wrong: "把气送得太重", avoid: "不要读成汉语“喝”那么重" },
  tr: { say: "先 t 再马上滑到 r", wrong: "读成 /tʃ/", avoid: "这是两个音连读，不是新音素" },
  dr: { say: "先 d 再马上滑到 r，嗓子麻", wrong: "读成 /dʒ/", avoid: "这是两个音连读" },
  ts: { say: "t 和 s 连在一起，像轻轻的“次”", wrong: "只读了 /s/", avoid: "词尾两个音都要在" },
  dz: { say: "d 和 z 连在一起，嗓子麻", wrong: "只读了 /z/", avoid: "这是两个音连读" },
  m: { say: "双唇闭上，气从鼻子出来", wrong: "嘴唇没闭紧", avoid: "不要从嘴里出气" },
  n: { say: "舌尖顶上牙床，气从鼻子出来", wrong: "读成 /ŋ/ 或 /l/", avoid: "不要用舌根" },
  y: { say: "嘴角向两边，很快滑开", wrong: "读成汉语“衣”拉很长", avoid: "它很短，马上接后面的音" },
  ei: { say: "从“诶”滑向短“衣”", wrong: "没有滑动，读成 /e/", avoid: "嘴巴要动一下" },
  ai: { say: "从“啊”滑向短“衣”", wrong: "读成汉语“爱”但不滑动", avoid: "要能感到嘴在动" },
  oi: { say: "先圆唇，再滑向短“衣”", wrong: "只读了一个音", avoid: "嘴巴要动" },
  ou: { say: "从中间滑向圆唇", wrong: "读成一个拉长的 /ɔː/", avoid: "要滑，不要停住" },
  au: { say: "从“啊”滑向圆唇", wrong: "和 no 的音混", avoid: "收尾要圆" },
  ia: { say: "从短“衣”滑向轻声", wrong: "起点张得太大", avoid: "不要读成 /eə/" },
  ea: { say: "嘴比 ear 张得更大，再滑向轻声", wrong: "读成 /ɪə/", avoid: "起点要更开" },
  ua: { say: "从圆唇滑向轻声", wrong: "读成 /uː/", avoid: "要滑一下" },
  "a-long": { say: "嘴张大，把“啊”拉长", wrong: "读短，像 cup", avoid: "要拉住" },
  "o-short": { say: "嘴张大，短，嘴唇略圆", wrong: "读成 /ɔː/ 或 /ʌ/", avoid: "不要拉长" },
  "o-long": { say: "嘴唇圆，把音拉长", wrong: "读成短音 /ɒ/", avoid: "要拉住" },
  wedge: { say: "嘴巴放松，短促的“啊”", wrong: "读成 /æ/ 或拉长", avoid: "不要拉长" },
};

const PLANS = {
  l0a: {
    book: "大概在 Starter Unit 1",
    goal: "分清字母的名字和它在单词里的声音",
    minutes: "10–15 分钟",
    say: "名字用来读字母，声音用来读单词",
    homework: "让学生回家读 A 到 H 的名字和声音，并读例词。",
    activities: ["先问：字母表里的 A 怎么念？", "再问：cat 里的 a 读什么？", "全班齐读名字、再齐读声音，各两遍。"],
  },
  l0b: {
    book: "大概在 Starter Unit 2",
    goal: "继续分清 I 到 Q 的名字和声音",
    minutes: "10–15 分钟",
    say: "先读名字，再读单词里的声音",
    homework: "抽三个字母，让学生说出名字和单词里的音。",
    activities: ["复习 A 的名字 /eɪ/ 和声音 /æ/。", "重点看 I、O：名字和声音差得远。", "开火车，每人读一个字母的名字和例词。"],
  },
  l0c: {
    book: "大概在 Starter Unit 3",
    goal: "读完 R 到 Z，知道 c、q、x 是两个音或有变化",
    minutes: "10–15 分钟",
    say: "x 是两个音连在一起",
    homework: "让学生把 26 个字母的声音在例词里各找一个。",
    activities: ["复习上一组里最容易混的两个字母。", "单独讲 X：box 里是 /ks/，不是一个音。", "Q 总是和 u 在一起，读 /kw/。"],
  },
  l1: {
    book: "",
    goal: "分清 p b、t d、k g，知道哪个送气",
    minutes: "10–15 分钟",
    say: "纸会动的是清音，喉咙麻的是浊音",
    homework: "拿一张纸，读 pen 和 bag，看纸动不动。",
    activities: ["清浊配对听：先 p 再 b。", "纸片放嘴前，全班看纸动不动。", "词尾也要读出来，不要吞掉。"],
  },
  l2: {
    book: "",
    goal: "分开 iː / ɪ / e / æ，嘴张得不一样",
    minutes: "10–15 分钟",
    say: "羊是长的，船是短的；猫要张大嘴",
    homework: "读 sheep 和 ship，让家长听哪个更长。",
    activities: ["先对比 sheep / ship。", "再对比 bed / bad，看谁的嘴张得更大。", "开火车读四个音，每人一个。"],
  },
  l3: {
    book: "",
    goal: "把三个音连成一个词，读出 cat、bed 这一类词",
    minutes: "10–15 分钟",
    say: "一个音、一个音，再连起来",
    homework: "把 cat、pen、dog 读给家长听，并说出中间的元音。",
    activities: ["请三个学生各读一个音，全班再连读。", "你用手势由慢到快。", "黑板上写下 c-a-t，对着三个音。"],
  },
  l4: {
    book: "",
    goal: "分开 ɑː、ɒ、ɔː、ʌ",
    minutes: "10–15 分钟",
    say: "拉长的“啊”和短的“啊”不是一个音",
    homework: "读 car 和 cup，说哪个要拉长。",
    activities: ["先复习 cat 的 /æ/，再进入后面的元音。", "对比 cart / cut。", "嘴巴放松的是 /ʌ/，不要拉长。"],
  },
  l5: {
    book: "",
    goal: "会 uː / ʊ，知道轻音 ə，能拍出音节",
    minutes: "10–15 分钟",
    say: "food 拉长，book 要短；不重读的地方轻轻带过",
    homework: "拍手数 teacher 有几拍，重音在哪一拍。",
    activities: ["对比 pool / pull。", "teacher 拍两下，重音在第一下。", "banana 拍三下，重音在中间。"],
  },
  l6: {
    book: "",
    goal: "会 f v s z，知道咬唇和送气的差别",
    minutes: "10–15 分钟",
    say: "v 要咬唇，喉咙要麻",
    homework: "读 vest 和 west，看有没有咬唇。",
    activities: ["f 和 v 对着做：一个只吹气，一个喉咙麻。", "全班分组，一组读 /f/，一组读 /v/。", "s 的舌尖不要伸到牙齿外面。"],
  },
  l7: {
    book: "",
    goal: "把 θ、ð 和 s、z、d 分开",
    minutes: "10–15 分钟",
    say: "看到我的舌尖了吗？伸出来——",
    homework: "照镜子读 think 和 this，舌尖要露出来。",
    activities: ["先看口型，再听 think / sink。", "ð 和 d 对比：they 不是 day。", "分组读，你看舌尖有没有出来。"],
  },
  l8: {
    book: "",
    goal: "会 tʃ dʒ，并说明 tr dr ts dz 是两个音连读",
    minutes: "10–15 分钟",
    say: "先堵住，再放开",
    homework: "读 chair 和 tree，说哪个是一个音、哪个是连读。",
    activities: ["先做 /tʃ/：堵住再放开。", "再告诉学生：tr、dr、ts、dz 教材单列，但是两个音连起来。", "读 cats、beds，把词尾两个音都读出来。"],
  },
  l9: {
    book: "",
    goal: "分开 m n ŋ，以及 l 和 r",
    minutes: "10–15 分钟",
    say: "sing 后面不要再加 g",
    homework: "读 light 和 right，说舌尖有没有顶住。",
    activities: ["听音举卡片：l 还是 r。", "sing 和 sin 对比，词尾不一样。", "ŋ 用舌根，气从鼻子走。"],
  },
  l10: {
    book: "",
    goal: "感到 eɪ aɪ ɔɪ 在滑动，分清 j 和 w",
    minutes: "10–15 分钟",
    say: "嘴巴要动一下，不能停住",
    homework: "读 say、my、boy，让家长看嘴有没有动。",
    activities: ["先听单元音 /e/，再听 /eɪ/，问有没有滑动。", "字母组合 ay、ai 先想到 /eɪ/。", "w 收圆嘴唇，不要咬唇。"],
  },
  l11: {
    book: "",
    goal: "读完剩下的双元音，能看着音标把例词读出来",
    minutes: "10–15 分钟",
    say: "先看重音，再一个音一个音读，最后连起来",
    homework: "挑 3 个今天的词，只看音标读给家长听，再听软件核对。",
    activities: ["now 和 no 对比，收尾不一样。", "用五步读生词：看音节、找重音、逐个音、连起来、听核对。", "错得多的音回到口型页再做一遍。"],
  },
};

export function classPlan(id) {
  return (
    PLANS[id] || {
      book: "课堂",
      goal: "把这一课的音听清、读准",
      minutes: "10–15 分钟",
      say: "先听，再看嘴，再一起读",
      homework: "把今天的例词读一遍。",
      activities: ["先听两遍再齐读。", "读错了用口令纠。", "小测先举手，再揭晓。"],
    }
  );
}

export function coachOf(item) {
  const extra = COACH[item.id] || {};
  return {
    say: extra.say || item.how || "看着老师的嘴跟着做",
    wrong: extra.wrong || item.point || "",
    avoid: extra.avoid || "",
  };
}

export function stepTip(step) {
  return STEP_TIPS[step] || STEP_TIPS[0];
}

const MOUTH = {
  ae: { jaw: 34, tongue: 78, out: 0, round: 0, caption: "嘴张大，舌尖抵下牙" },
  e: { jaw: 16, tongue: 62, out: 0, round: 0, caption: "嘴张开一点，比 /æ/ 小" },
  "i-long": { jaw: 8, tongue: 48, out: 0, round: 0, caption: "嘴角拉开，舌前部抬高" },
  "i-short": { jaw: 10, tongue: 54, out: 0, round: 0, caption: "嘴微张，比 /iː/ 松" },
  theta: { jaw: 14, tongue: 58, out: 1, round: 0, caption: "舌尖伸到上下牙之间" },
  eth: { jaw: 14, tongue: 58, out: 1, round: 0, caption: "舌尖伸出，嗓子振动" },
  v: { jaw: 6, tongue: 70, out: 0, round: 0, bite: 1, caption: "上牙咬住下嘴唇" },
  f: { jaw: 6, tongue: 70, out: 0, round: 0, bite: 1, caption: "上牙轻咬下唇，只吹气" },
  w: { jaw: 10, tongue: 64, out: 0, round: 1, caption: "嘴唇收圆，不要咬唇" },
  sh: { jaw: 12, tongue: 60, out: 0, round: 1, caption: "嘴唇收圆，舌面抬起" },
  zh: { jaw: 12, tongue: 60, out: 0, round: 1, caption: "嘴和 /ʃ/ 一样，嗓子振动" },
  r: { jaw: 14, tongue: 52, out: 0, round: 0, curl: 1, caption: "舌尖后收，不要顶住" },
  l: { jaw: 12, tongue: 46, out: 0, round: 0, tip: 1, caption: "舌尖顶住上牙床后面" },
  "u-long": { jaw: 10, tongue: 66, out: 0, round: 1, caption: "嘴唇收圆收紧，音拉长" },
  "u-short": { jaw: 12, tongue: 64, out: 0, round: 1, caption: "嘴唇微圆，音要短" },
  er: { jaw: 16, tongue: 58, out: 0, round: 0, caption: "嘴微开，舌中部抬起" },
  ch: { jaw: 12, tongue: 56, out: 0, round: 1, caption: "先堵住，再收圆嘴唇放开" },
  dzh: { jaw: 12, tongue: 56, out: 0, round: 1, caption: "先堵住再放开，嗓子振动" },
  ng: { jaw: 14, tongue: 70, out: 0, round: 0, caption: "舌根抬起，气从鼻子走" },
  p: { jaw: 4, tongue: 72, out: 0, round: 0, caption: "双唇闭上再打开，纸会动" },
  b: { jaw: 4, tongue: 72, out: 0, round: 0, caption: "双唇闭上再打开，喉咙麻" },
  ei: { jaw: 14, tongue: 56, out: 0, round: 0, caption: "嘴从张开滑向拉宽" },
  ai: { jaw: 28, tongue: 74, out: 0, round: 0, caption: "嘴从张大滑向拉宽" },
  au: { jaw: 30, tongue: 76, out: 0, round: 1, caption: "嘴从张大滑向收圆" },
};

export function mouthSvg(id) {
  const cfg = MOUTH[id] || { jaw: 16, tongue: 64, out: 0, round: 0, caption: "看老师的嘴，跟着做" };
  const jaw = cfg.jaw;
  const tongueY = cfg.tongue;
  const lip = cfg.round ? 10 : 0;
  const tonguePath = cfg.out
    ? "M78," + (tongueY - 6) + " C140," + (tongueY - 16) + " 230," + (tongueY - 8) + " 292," + (tongueY + 8)
    : cfg.curl
      ? "M78," + tongueY + " C130," + (tongueY + 10) + " 190," + (tongueY - 24) + " 230," + (tongueY - 8)
      : cfg.tip
        ? "M78," + (tongueY + 8) + " C140," + tongueY + " 210," + (tongueY - 28) + " 248,78"
        : "M78," + tongueY + " C140," + (tongueY - 8) + " 200," + (tongueY + 4) + " 236," + (tongueY - 2);
  const bite = cfg.bite
    ? '<path d="M236,108 C250,112 258,132 248,142" fill="none" stroke="#9c4630" stroke-width="7" stroke-linecap="round"/>'
    : "";
  return (
    '<figure class="mouth-fig"><svg viewBox="0 0 340 230" role="img" aria-label="' +
    esc(cfg.caption) +
    '"><rect width="340" height="230" rx="12" fill="#fffaf2"/>' +
    '<path d="M48,58 C130,40 200,44 236,64" fill="none" stroke="#8c7b63" stroke-width="3" opacity="0.7"/>' +
    '<path d="M48,58 C40,110 44,170 58,198" fill="none" stroke="#8c7b63" stroke-width="3" opacity="0.45"/>' +
    '<path d="M58,198 C130,214 210,210 250,188" fill="none" stroke="#8c7b63" stroke-width="3" opacity="0.35"/>' +
    '<path d="M236,64 C268,74 286,92 286,112" fill="none" stroke="#8c7b63" stroke-width="6" stroke-linecap="round"/>' +
    '<rect x="228" y="96" width="36" height="12" rx="3" fill="#fff" stroke="#b9ab97"/>' +
    '<rect x="228" y="' +
    (118 + jaw) +
    '" width="36" height="12" rx="3" fill="#fff" stroke="#b9ab97"/>' +
    '<path d="' +
    tonguePath +
    '" fill="#e7a3a3" stroke="#b55858" stroke-width="2"/>' +
    '<path d="M210,' +
    (104 - lip) +
    " C250," +
    (100 - lip) +
    " 274," +
    (108 + jaw / 5) +
    " 270," +
    (118 + jaw / 6) +
    '" fill="none" stroke="#9c4630" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M270,' +
    (132 + jaw) +
    " C274," +
    (146 + jaw) +
    " 246," +
    (154 + jaw) +
    " 214," +
    (150 + jaw * 0.4) +
    '" fill="none" stroke="#9c4630" stroke-width="5" stroke-linecap="round"/>' +
    bite +
    '<text x="168" y="214" text-anchor="middle" font-size="14" fill="#6f675c">舌</text>' +
    '<text x="300" y="148" text-anchor="middle" font-size="13" fill="#6f675c">唇</text>' +
    "</svg><figcaption>" +
    esc(cfg.caption) +
    "</figcaption></figure>"
  );
}
