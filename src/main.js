import { classPlan } from "./classroom.js";
import {
  MANNERS,
  PLACES,
  bandCopy,
  bandOf,
  blendWords,
  byId,
  lessonById,
  lessons,
  letters,
  loneIds,
  pairAsks,
  pairs,
  phonemes,
  voicePairs,
} from "./data.js";
import { onAudio, playBlend, playLetter, playPhoneme, playPhonemes, playWord, playWords } from "./speech.js";
import {
  classPrefs,
  initStore,
  isLessonDone,
  learnedIds,
  markLessonDone,
  markSeen,
  progressMap,
  recordAnswer,
  resetProgress,
  setPref,
  storageMode,
} from "./store.js";

const app = document.querySelector("#app");
const letterByName = letters.reduce((acc, item) => {
  acc[item.letter] = item;
  return acc;
}, {});

const state = {
  view: "lessons",
  lessonId: null,
  lessonView: "class",
  step: 0,
  focus: 0,
  quiz: null,
  pairIndex: 0,
  selectedId: "i-long",
  query: "",
  chartMode: "list",
  band: "",
  classmode: false,
  loop3: false,
  volumeOk: false,
};

const views = [
  ["lessons", "课程"],
  ["learn", "音标表"],
  ["pairs", "易混"],
  // ["progress", "进度"],
];

function esc(value) {
  return String(value === undefined || value === null ? "" : value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function row(id) {
  return progressMap()[id];
}

function shuffle(list) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const temp = copy[index];
    copy[index] = copy[swap];
    copy[swap] = temp;
  }
  return copy;
}

function stripIpa(text) {
  return String(text || "").replace(/[/[\]ˈˌː\s]/g, "");
}

function wordWithFocus(word, focus) {
  if (!focus) return '<span class="word">' + esc(word) + "</span>";
  const pos = word.toLowerCase().indexOf(focus.toLowerCase());
  if (pos === -1) return '<span class="word">' + esc(word) + "</span>";
  return (
    '<span class="word">' +
    esc(word.slice(0, pos)) +
    "<u>" +
    esc(word.slice(pos, pos + focus.length)) +
    "</u>" +
    esc(word.slice(pos + focus.length)) +
    "</span>"
  );
}

/* ---------------- 音标表（字典） ---------------- */

function symbolButton(item, extraClass) {
  const seen = row(item.id) ? "seen" : "";
  const selected = item.id === state.selectedId ? "selected" : "";
  return (
    '<button type="button" class="symbol-btn ' +
    item.kind +
    " " +
    seen +
    " " +
    selected +
    (item.cluster ? " cluster" : "") +
    " " +
    (extraClass || "") +
    '" data-action="select" data-id="' +
    item.id +
    '" title="' +
    esc(item.cluster ? item.symbol + "，两个辅音连着读，不是新的音" : item.symbol) +
    '"><span class="ipa">' +
    esc(item.symbol) +
    "</span></button>"
  );
}

function matches(item, query) {
  if (!query) return true;
  const haystack = [
    item.symbol,
    item.subgroup,
    item.tip,
    item.letters,
    item.example ? item.example.word : "",
  ]
    .concat(
      item.examples.map((example) => example.word + " " + example.zh + " " + example.ipa),
    )
    .join(" ")
    .toLowerCase();
  return haystack.indexOf(query) !== -1;
}

function chartHtml() {
  const query = state.query.trim().toLowerCase();
  if (query) {
    const found = phonemes.filter((item) => matches(item, query));
    if (!found.length) return '<p class="empty">没有找到「' + esc(state.query.trim()) + "」。</p>";
    return (
      '<div class="result-list">' +
      found
        .map((item) => {
          const sample = item.examples[0];
          return (
            '<button type="button" class="result ' +
            item.kind +
            (item.id === state.selectedId ? " selected" : "") +
            '" data-action="select" data-id="' +
            item.id +
            '"><span class="ipa">' +
            esc(item.symbol) +
            "</span><small>" +
            esc(sample.word) +
            " · " +
            esc(sample.zh) +
            "</small></button>"
          );
        })
        .join("") +
      "</div>"
    );
  }
  if (state.chartMode === "place") return placeChartHtml();
  return listChartHtml();
}

function listChartHtml() {
  const pairRow = (pair) =>
    '<div class="voice-row"><div class="voice-cell"><span class="tag">清</span>' +
    symbolButton(byId[pair[0]]) +
    '</div><div class="voice-cell"><span class="tag voiced">浊</span>' +
    symbolButton(byId[pair[1]]) +
    "</div></div>";
  const loneRows = (ids) => {
    const quiet = ids.filter((id) => !byId[id].voiced);
    const voiced = ids.filter((id) => byId[id].voiced);
    const count = Math.max(quiet.length, voiced.length);
    let html = "";
    for (let index = 0; index < count; index += 1) {
      const left = quiet[index]
        ? '<span class="tag">清</span>' + symbolButton(byId[quiet[index]])
        : "";
      const right = voiced[index]
        ? '<span class="tag voiced">浊</span>' + symbolButton(byId[voiced[index]])
        : "";
      html += '<div class="voice-row"><div class="voice-cell">' + left + '</div><div class="voice-cell">' + right + "</div></div>";
    }
    return html;
  };
  const mannerLabel = { 爆破: "爆破音", 摩擦: "摩擦音", 破擦: "破擦音", 鼻音: "鼻音", 舌侧: "舌边音", 半元音: "半元音" };
  const mannerBlocks = MANNERS.map((manner) => {
    const pairs = voicePairs.filter((pair) => byId[pair[0]].manner === manner);
    const plain = pairs.filter((pair) => !byId[pair[0]].cluster);
    const clusters = pairs.filter((pair) => byId[pair[0]].cluster);
    const lones = loneIds.filter((id) => byId[id].manner === manner);
    const count = plain.length * 2 + clusters.length * 2 + lones.length;
    const clusterBlock = clusters.length
      ? '<div class="cluster-band"><h3 class="mini">两个音连着读 · ' +
        clusters.length * 2 +
        ' 个</h3><p class="letters">这四个不是新的音。课本一共 48 个：44 个音，再加上这四个。tr、dr、ts、dz 就是两个辅音连着读，虚线框里的是它们。</p>' +
        clusters.map(pairRow).join("") +
        "</div>"
      : "";
    return (
      '<h3 class="mini">' +
      mannerLabel[manner] +
      " · " +
      count +
      ' 个</h3><div class="voice-table"><div class="voice-head"><span>清辅音</span><span>浊辅音</span></div>' +
      plain.map(pairRow).join("") +
      loneRows(lones) +
      clusterBlock +
      "</div>"
    );
  }).join("");
  const consonantCount = voicePairs.length * 2 + loneIds.length;

  return (
    '<section class="sheet"><h2 class="section-label">单元音 · 12 个</h2><p class="letters">' +
    esc(bandCopy[0].line) +
    " 按舌头的前后分。</p>" +
    vowelGroupHtml(monophthongGroups) +
    '</section><section class="sheet"><h2 class="section-label">双元音 · 8 个</h2><p class="letters">' +
    esc(bandCopy[1].line) +
    "</p>" +
    vowelGroupHtml(diphthongGroups) +
    '</section><section class="sheet"><h2 class="section-label">辅音 · ' +
    consonantCount +
    ' 个</h2><p class="letters">左边嗓子不震，右边嗓子会震。下面按嘴怎么出气来分。</p>' +
    mannerBlocks +
    "</section>"
  );
}

const placeLabel = {
  双唇: "双唇",
  唇齿: "牙咬唇",
  齿间: "牙缝",
  齿龈: "上牙床",
  龈后: "牙床后",
  硬腭: "上腭",
  软腭: "口腔后",
  声门: "嗓子眼",
};

function placeChartHtml() {
  const monophthongs = phonemes.filter((item) => item.chart);
  const mannerLabel = { 爆破: "爆破音", 摩擦: "摩擦音", 破擦: "破擦音", 鼻音: "鼻音", 舌侧: "舌边音", 半元音: "半元音" };
  const placed = monophthongs
    .map(
      (item) =>
        '<span class="chart-btn" style="left:' +
        item.chart.x +
        "%;top:" +
        item.chart.y +
        '%">' +
        symbolButton(item) +
        "</span>",
    )
    .join("");
  const rows = MANNERS.map((manner) => {
    const items = phonemes.filter((item) => item.manner === manner);
    const voices = [];
    if (items.some((item) => !item.voiced)) voices.push(false);
    if (items.some((item) => item.voiced)) voices.push(true);
    return voices
      .map((voiced, index) => {
        const tds = PLACES.map((place) => {
          const cellItems = items.filter((item) => item.place === place && item.voiced === voiced);
          return (
            '<td><div class="cell">' +
            cellItems.map((item) => symbolButton(item, voiced ? "is-voiced" : "is-voiceless")).join("") +
            "</div></td>"
          );
        }).join("");
        const mannerCell =
          index === 0
            ? '<th class="manner" rowspan="' + voices.length + '">' + mannerLabel[manner] + "</th>"
            : "";
        return (
          "<tr>" +
          mannerCell +
          '<th class="voice-side' +
          (voiced ? " voiced" : "") +
          '">' +
          (voiced ? "浊" : "清") +
          "</th>" +
          tds +
          "</tr>"
        );
      })
      .join("");
  }).join("");
  return (
    '<section class="sheet"><h2 class="section-label">单元音 · ' +
    monophthongs.length +
    ' 个</h2><p class="letters">上面的音舌头抬得高，下面的音嘴巴张得大。左边是前元音，中间是中元音，右边是后元音。带 ː 的要拉长。</p><div class="vowel-chart"><span class="axis high">高</span><span class="axis low">低</span><span class="axis front">前</span><span class="axis mid">中</span><span class="axis back">后</span><div class="quad"></div>' +
    placed +
    '</div><h3 class="mini">双元音 · 8 个</h3><p class="letters">从一个音滑到另一个，不画在这张图上。</p>' +
    vowelGroupHtml(diphthongGroups) +
    '</section><section class="sheet"><h2 class="section-label">辅音 · ' +
    phonemes.filter((item) => item.manner).length +
    ' 个</h2><p class="letters">横着看嘴的哪个地方在用力。清辅音嗓子不震，浊辅音嗓子会震。鼻音、舌边音、半元音都是嗓子会震的。虚线框里是两个辅音连着读，不是新的音。</p><div class="table-wrap"><table class="grid"><thead><tr><th colspan="2"></th>' +
    PLACES.map((place) => "<th>" + placeLabel[place] + "</th>").join("") +
    "</tr></thead><tbody>" +
    rows +
    "</tbody></table></div></section>"
  );
}

function vowelGroupHtml(groups) {
  return groups
    .map((group) => {
      return (
        '<h3 class="mini">' +
        group[0] +
        " · " +
        group[1].length +
        ' 个</h3><p class="letters">' +
        group[2] +
        '</p><div class="diphthongs">' +
        group[1].map((id) => symbolButton(byId[id])).join("") +
        "</div>"
      );
    })
    .join("");
}

function vowelGroupOf(id) {
  const groups = monophthongGroups.concat(diphthongGroups);
  for (let index = 0; index < groups.length; index += 1) {
    if (groups[index][1].indexOf(id) !== -1) return groups[index][0];
  }
  return "";
}

const monophthongGroups = [
  ["前元音", ["i-long", "i-short", "e", "ae"], "舌头靠前。"],
  ["中元音", ["er", "schwa", "wedge"], "舌头在中间。"],
  ["后元音", ["u-long", "u-short", "o-long", "o-short", "a-long"], "舌头靠后。"],
];

const diphthongGroups = [
  ["嘴由大变小", ["ei", "ai", "oi", "au", "ou"], "从大收到小，滑向短的 /ɪ/ 或 /ʊ/。"],
  ["滑向轻音", ["ia", "ea", "ua"], "最后都滑向最轻的 /ə/。"],
];

function chartModeHtml() {
  const modes = [
    ["list", "元音和辅音"],
    ["place", "嘴里的位置"],
  ];
  return (
    '<div class="chart-modes">' +
    modes
      .map((mode) => {
        return (
          '<button type="button" class="' +
          (state.chartMode === mode[0] ? "active" : "") +
          '" data-action="chart-mode" data-mode="' +
          mode[0] +
          '">' +
          mode[1] +
          "</button>"
        );
      })
      .join("") +
    "</div>"
  );
}

/** 慢速统一用正常 mp3，速度 0.5。去掉 data-rate 会回到原来的 w-<word>-slow.mp3。 */
function slowAttrs() {
  return '" data-slow="1" data-rate="0.5"';
}

function detailHtml() {
  const item = byId[state.selectedId];
  if (!item) return "";
  const related = (item.confuse || [])
    .map((id) => byId[id])
    .filter(Boolean)
    .map((other) => symbolButton(other))
    .join("");
  const examples = item.examples
    .map((example) => {
      return (
        '<div class="example"><div><div class="word">' +
        esc(example.word) +
        '</div><div class="meta"><span class="ipa">' +
        esc(example.ipa) +
        "</span> · " +
        esc(example.zh) +
        '</div></div><div class="actions"><button type="button" class="text-btn" data-action="play-word" data-word="' +
        esc(example.word) +
        '">听</button><button type="button" class="text-btn" data-action="play-word" data-word="' +
        esc(example.word) +
        slowAttrs() +
        ">慢速</button></div></div>"
      );
    })
    .join("");
  return (
    '<p class="eyebrow">' +
    esc(item.kind === "vowel" ? vowelGroupOf(item.id) : bandOf(item)) +
    (item.kind === "vowel" && item.subgroup !== "双元音" ? " · " + esc(item.subgroup) : "") +
    (item.cluster ? " · 两个辅音连着读" : "") +
    '</p><button type="button" class="hero ipa ' +
    item.kind +
    '" data-action="play-phoneme" data-id="' +
    item.id +
    '">' +
    esc(item.symbol) +
    '</button><p class="how">' +
    esc(item.how) +
    '</p><p class="point"><strong>小提示</strong> ' +
    esc(item.point) +
    '</p><p class="letters">看到这些字母，先想到它：' +
    esc(item.letters) +
    '</p><div class="examples">' +
    examples +
    "</div>" +
    (related ? '<div class="confuse"><span class="letters">最容易混：</span>' + related + "</div>" : "") +
    '<div class="tip-box"><strong>嘴巴怎么动</strong><p>' +
    esc(item.tip) +
    "</p></div>"
  );
}

function learnHtml() {
  return (
    '<div class="workspace"><div class="main-column"><input id="q" class="search" type="search" placeholder="搜音标、单词或中文，例如 ship、θ" value="' +
    esc(state.query) +
    '" />' +
    chartModeHtml() +
    '<div id="chart">' +
    chartHtml() +
    '</div></div><aside id="detail" class="detail">' +
    detailHtml() +
    "</aside></div>"
  );
}

/* ---------------- 课程 ---------------- */

function nextLesson() {
  for (let index = 0; index < lessons.length; index += 1) {
    if (!isLessonDone(lessons[index].id)) return lessons[index];
  }
  return lessons[lessons.length - 1];
}

function lessonsListHtml() {
  const current = lessonById(state.lessonId);
  const opened = current ? lessons.findIndex((lesson) => lesson.id === current.id) : -1;
  const openLesson = current || lessons[0];
  const reached = (lesson, index) => isLessonDone(lesson.id) || index <= opened;
  const finished = lessons.filter(reached).length;
  const list = lessons
    .map((lesson, index) => {
      const plan = classPlan(lesson.id);
      const done = reached(lesson, index);
      const isCurrent = current && lesson.id === current.id;
      return (
        '<button type="button" class="lesson-row' +
        (done ? " done" : "") +
        (isCurrent ? " current" : "") +
        '" data-action="open-lesson" data-id="' +
        lesson.id +
        '"><span class="lesson-no">' +
        (index + 1) +
        '</span><span class="lesson-text"><strong>' +
        esc(lesson.title) +
        "</strong><small>" +
        (plan.book ? esc(plan.book) + " · " : "") +
        esc(lesson.subtitle) +
        "</small></span></button>"
      );
    })
    .join("");
  // 暂时隐藏「先把教室音响调好」
  // const volume = state.volumeOk
  //   ? ""
  //   : '<section class="sheet volume-check"><h2 class="section-label">先把教室音响调好</h2><p>软件里的声音已经开到最大。教室很大，请把功放也开到后排能听清。先听 /f/，再听 /aʊ/。</p><div class="actions"><button type="button" class="cta ghost" data-action="play-sound" data-id="f">听 /f/</button><button type="button" class="cta ghost" data-action="play-sound" data-id="au">听 /aʊ/</button><button type="button" class="text-btn" data-action="volume-ok">两个都能听清</button></div></section>';
  return (
    // volume +
    '<section class="sheet intro"><h2 class="section-label">按教材上课</h2><p class="how">每课列出这一课的字母和音，点开就能听。</p><p>顺序：先字母，再拼单词，再音标。</p><div class="actions"><button type="button" class="cta" data-action="open-lesson" data-id="' +
    openLesson.id +
    '">' +
    (current ? "打开这一课" : "从第一课开始") +
    "</button><button type=\"button\" class=\"text-btn\" data-action=\"goto\" data-view=\"learn\">音标表</button></div><p class=\"letters\">这台电脑讲过 " +
    finished +
    " / " +
    lessons.length +
    " 节。按人教版七年级上册的顺序排，别的课本对一下就行。</p></section>" +
    '<section class="lesson-list">' +
    list +
    "</section>"
  );
}

function lessonHeaderHtml(lesson, extra) {
  return (
    '<div class="lesson-head"><button type="button" class="text-btn back" data-action="goto" data-view="lessons">← 回课程</button><div><h2 class="lesson-title">' +
    esc(lesson.title) +
    "</h2><p class=\"lesson-sub\">" +
    esc(lesson.subtitle) +
    "</p></div>" +
    (extra || "") +
    "</div>"
  );
}

function letterCardHtml(item) {
  const learn = row(item.soundIds[0]) ? "seen" : "";
  return (
    '<article class="letter-card ' +
    learn +
    '"><div class="letter-big">' +
    esc(item.letter) +
    '</div><div class="letter-info"><p>字母名 <b class="ipa">' +
    esc(item.nameIpa) +
    '</b> <button type="button" class="text-btn" data-action="play-letter" data-letter="' +
    item.letter +
    '">听</button></p><p>在单词里常读 <b class="ipa">' +
    esc(item.soundIpa) +
    '</b> <button type="button" class="text-btn" data-action="play-sound" data-id="' +
    item.soundIds[0] +
    '">听</button></p><p class="example-line">' +
    wordWithFocus(item.example.word, item.letter) +
    " <span class=\"muted\">" +
    esc(item.example.zh) +
    '</span> <button type="button" class="text-btn" data-action="play-word" data-word="' +
    esc(item.example.word) +
    '">听例词</button></p>' +
    (item.note ? '<p class="muted small">' + esc(item.note) + "</p>" : "") +
    "</div></article>"
  );
}

function lessonCardsHtml(lesson) {
  if (lesson.type === "letters") {
    const cards = lesson.letterNames
      .map((name) => letterCardHtml(letterByName[name]))
      .join("");
    return '<section class="cards">' + cards + "</section>";
  }
  if (lesson.type === "sounds") {
    const cards = lesson.phonemeIds
      .map((id) => {
        const item = byId[id];
        const examples = item.examples
          .map((example) => {
            return (
              '<div class="example"><div>' +
              wordWithFocus(example.word, example.focus) +
              ' <span class="meta">' +
              esc(example.ipa) +
              " · " +
              esc(example.zh) +
              '</span></div><div class="actions"><button type="button" class="text-btn" data-action="play-word" data-word="' +
              esc(example.word) +
              '">听</button><button type="button" class="text-btn" data-action="play-word" data-word="' +
              esc(example.word) +
              slowAttrs() +
              ">慢速</button></div></div>"
            );
          })
          .join("");
        return (
          '<article class="sound-card' +
          (item.cluster ? " cluster" : "") +
          '"><div class="sound-top"><button type="button" class="sound-symbol ipa ' +
          item.kind +
          '" data-action="play-sound" data-id="' +
          item.id +
          '">' +
          esc(item.symbol) +
          '</button><div class="sound-talk"><p class="how">' +
          esc(item.how) +
          '</p><p class="letters">看到这些字母，先想到它：' +
          esc(item.letters) +
          "</p></div></div><div class=\"examples\">" +
          examples +
          '</div><div class="tip-box"><strong>嘴巴怎么动</strong><p>' +
          esc(item.tip) +
          '</p></div><p class="muted small">' +
          esc(item.point) +
          "</p></article>"
        );
      })
      .join("");
    return '<section class="cards">' + cards + "</section>";
  }
  // blend
  const cards = lesson.words
    .map((word) => {
      const entry = blendWords.find((item) => item.word === word);
      if (!entry) return "";
      const parts = entry.parts
        .map((id) => '<span class="blend-part ipa">' + esc(byId[id].symbol) + "</span>")
        .join("");
      return (
        '<article class="blend-card" data-blend-card><div class="blend-letters">' +
        parts +
        '<span class="blend-arrow">→</span><span class="blend-word">' +
        esc(entry.word) +
        "</span></div><p class=\"muted\">" +
        esc(entry.zh) +
        '</p><div class="actions"><button type="button" class="cta small" data-action="blend" data-word="' +
        entry.word +
        '">拼一拼</button><button type="button" class="text-btn" data-action="play-word" data-word="' +
        entry.word +
        '">听整词</button><button type="button" class="text-btn" data-action="play-word" data-word="' +
        entry.word +
        slowAttrs() +
        ">慢速</button></div></article>"
      );
    })
    .join("");
  return '<section class="cards blend-cards">' + cards + "</section>";
}

function lessonHtml() {
  const lesson = lessonById(state.lessonId);
  if (!lesson) return lessonsListHtml();
  const extra =
    '<button type="button" class="text-btn" data-action="mark-done">' +
    (isLessonDone(lesson.id) ? "已讲过，回课程" : "这节讲完了") +
    "</button>";
  return lessonHeaderHtml(lesson, extra) + lessonCardsHtml(lesson);
}

/* ---------------- 出题 ---------------- */

function fillOptions(targetId, count, excludedIds) {
  const target = byId[targetId];
  const blocked = excludedIds || [];
  const result = [targetId];
  const add = (id) => {
    if (result.length >= count) return;
    if (result.indexOf(id) !== -1 || blocked.indexOf(id) !== -1) return;
    if (!byId[id]) return;
    result.push(id);
  };
  (target.confuse || []).forEach(add);
  shuffle(phonemes)
    .filter((item) => item.kind === target.kind)
    .forEach((item) => add(item.id));
  if (result.length < count) {
    shuffle(phonemes).forEach((item) => {
      if (result.indexOf(item.id) === -1) result.push(item.id);
    });
  }
  return shuffle(result.slice(0, count));
}

function readQuestion(item) {
  const example = item.examples[Math.floor(Math.random() * item.examples.length)];
  const symbolString = stripIpa(example.ipa);
  const excluded = phonemes
    .filter((other) => {
      const symbol = stripIpa(other.symbol);
      return other.id !== item.id && symbol && symbolString.indexOf(symbol) !== -1;
    })
    .map((other) => other.id);
  return {
    kind: "read",
    phonemeId: item.id,
    word: example.word,
    zh: example.zh,
    focus: example.focus,
    ipa: example.ipa,
    options: fillOptions(item.id, 4, excluded),
  };
}

function soundQuestion(id) {
  return { kind: "sound", phonemeId: id, options: fillOptions(id, 4, []) };
}

function letterQuestion(item, pool) {
  const options = [item.letter];
  shuffle(pool).forEach((other) => {
    if (options.length < 4 && options.indexOf(other.letter) === -1) options.push(other.letter);
  });
  return { kind: "letter", letter: item.letter, options: shuffle(options) };
}

function wordQuestion(entry, pool) {
  const options = [entry.word];
  shuffle(pool).forEach((other) => {
    if (options.length < 4 && options.indexOf(other.word) === -1) options.push(other.word);
  });
  return { kind: "word", word: entry.word, zh: entry.zh, options: shuffle(options) };
}

function makeLessonQuiz(lesson) {
  const questions = [];
  if (lesson.type === "letters") {
    const pool = lesson.letterNames.map((name) => letterByName[name]);
    shuffle(pool)
      .slice(0, Math.min(6, pool.length))
      .forEach((item) => questions.push(letterQuestion(item, pool)));
  } else if (lesson.type === "sounds") {
    lesson.phonemeIds.forEach((id) => questions.push(readQuestion(byId[id])));
    (lesson.reviewIds || []).forEach((id) => questions.push(soundQuestion(id)));
  } else {
    const pool = blendWords.filter((entry) => lesson.words.indexOf(entry.word) !== -1);
    shuffle(pool)
      .slice(0, Math.min(5, pool.length))
      .forEach((entry) => questions.push(wordQuestion(entry, pool)));
  }
  return {
    mode: "lesson",
    lessonId: lesson.id,
    questions: shuffle(questions),
    index: 0,
    picked: null,
    revealed: false,
    correctCount: 0,
    phase: "ask",
  };
}

function makePractice(mode) {
  const learned = learnedIds().filter((id) => byId[id]);
  if (learned.length < 4) return null;
  const items = learned.map((id) => byId[id]);
  const questions = [];
  const total = 10;
  const queue = [];
  for (let index = 0; index < total; index += 1) {
    // 一轮轮洗牌，避免同一个音连着出好几次
    if (!queue.length) {
      queue.push.apply(queue, shuffle(items.slice()));
      const last = questions.length ? questions[questions.length - 1].phonemeId : null;
      if (queue.length > 1 && queue[0].id === last) {
        const swap = queue[0];
        queue[0] = queue[1];
        queue[1] = swap;
      }
    }
    const item = queue.shift();
    questions.push(mode === "read" ? readQuestion(item) : soundQuestion(item.id));
  }
  return {
    mode: mode,
    practice: true,
    questions: questions,
    index: 0,
    picked: null,
    revealed: false,
    correctCount: 0,
    phase: "ask",
  };
}

/* ---------------- 练习界面 ---------------- */

function currentQuestion() {
  return state.quiz ? state.quiz.questions[state.quiz.index] : null;
}

function quizTarget(question) {
  return question.phonemeId || question.letter || question.word;
}

function questionPromptHtml(question, quiz) {
  if (question.kind === "read") {
    const reveal = !!quiz.revealed;
    return (
      '<div class="prompt">' +
      wordWithFocus(question.word, question.focus) +
      '<p class="meta">' +
      esc(question.zh) +
      (reveal ? ' · <span class="ipa">' + esc(question.ipa) + "</span>" : "") +
      '</p><p class="ask">划线部分读哪个音？</p></div>'
    );
  }
  if (question.kind === "sound") {
    return (
      '<div class="prompt"><button type="button" class="speaker" data-action="replay">听音</button><p class="ask">先听声音，再选音标</p></div>'
    );
  }
  if (question.kind === "letter") {
    return (
      '<div class="prompt"><button type="button" class="speaker" data-action="replay">听字母名</button><p class="ask">听一听，是哪个字母？</p></div>'
    );
  }
  return (
    '<div class="prompt"><button type="button" class="speaker" data-action="replay">听单词</button><p class="ask">听一听，是哪个词？</p></div>'
  );
}

function choicesHtml(question, quiz) {
  const target = quizTarget(question);
  if (question.kind === "letter" || question.kind === "word") {
    return (
      '<div class="choices">' +
      question.options
        .map((option) => {
          let mark = "";
          let badge = "";
          if (quiz.revealed) {
            if (option === target) {
              mark = " good";
              badge = '<span class="mark">✓</span>';
            } else if (option === quiz.picked) {
              mark = " bad";
              badge = '<span class="mark">✗</span>';
            }
          } else if (option === quiz.picked) mark = " chosen";
          const sub =
            question.kind === "word"
              ? '<small>' + esc((blendWords.find((entry) => entry.word === option) || {}).zh || "") + "</small>"
              : "";
          return (
            '<button type="button" class="choice ' +
            (question.kind === "letter" ? "letter" : "word") +
            mark +
            '" data-action="answer" data-id="' +
            esc(option) +
            '" ' +
            (quiz.revealed ? 'disabled="disabled"' : "") +
            ">" +
            esc(option) +
            sub +
            badge +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }
  return (
    '<div class="choices">' +
    question.options
      .map((id) => {
        const option = byId[id];
        let mark = "";
        let badge = "";
        if (quiz.revealed) {
          if (id === target) {
            mark = " good";
            badge = '<span class="mark">✓</span>';
          } else if (id === quiz.picked) {
            mark = " bad";
            badge = '<span class="mark">✗</span>';
          }
        } else if (id === quiz.picked) mark = " chosen";
        return (
          '<button type="button" class="choice ipa ' +
          option.kind +
          mark +
          '" data-action="answer" data-id="' +
          id +
          '" ' +
          (quiz.revealed ? 'disabled="disabled"' : "") +
          ">" +
          esc(option.symbol) +
          badge +
          "</button>"
        );
      })
      .join("") +
    "</div>"
  );
}

function feedbackHtml(question, quiz) {
  if (!quiz.revealed) {
    return '<p class="feedback">' + (quiz.picked ? "已记下选择。先让全班答完，再揭晓。" : "先选一个答案。揭晓前不显示对错。") + "</p>";
  }
  const right = quiz.picked === quizTarget(question);
  if (question.kind === "read") {
    const item = byId[question.phonemeId];
    return (
      '<p class="feedback ' +
      (right ? "ok" : "no") +
      '">' +
      (right ? "对了！" : "再看一眼：") +
      " 划线部分读 <b class=\"ipa\">/" +
      esc(item.symbol) +
      '/</b>。' +
      esc(item.point) +
      "</p>"
    );
  }
  if (question.kind === "sound") {
    const item = byId[question.phonemeId];
    const example = item.examples[0];
    return (
      '<p class="feedback ' +
      (right ? "ok" : "no") +
      '">' +
      (right ? "对了！" : "这是") +
      ' <b class="ipa">/' +
      esc(item.symbol) +
      "/</b>　" +
      esc(item.how) +
      "　例词：" +
      esc(example.word) +
      " " +
      esc(example.zh) +
      "</p>"
    );
  }
  if (question.kind === "letter") {
    const item = letterByName[question.letter];
    return (
      '<p class="feedback ' +
      (right ? "ok" : "no") +
      '">' +
      (right ? "对了！" : "这是字母") +
      " <b>" +
      esc(item.letter) +
      '</b>：名字读 <span class="ipa">' +
      esc(item.nameIpa) +
      '</span>，在单词里常读 <span class="ipa">' +
      esc(item.soundIpa) +
      "</span>，例词 " +
      esc(item.example.word) +
      " " +
      esc(item.example.zh) +
      "。</p>"
    );
  }
  const entry = blendWords.find((item) => item.word === question.word) || {};
  return (
    '<p class="feedback ' +
    (right ? "ok" : "no") +
    '">' +
    (right ? "对了！" : "听到的是") +
    " <b>" +
    esc(question.word) +
    "</b> " +
    esc(entry.zh || question.zh) +
    "。</p>"
  );
}

function quizCardHtml() {
  const quiz = state.quiz;
  const question = currentQuestion();
  const lesson = quiz.mode === "lesson" ? lessonById(quiz.lessonId) : null;
  const title = lesson ? lesson.title : quiz.mode === "read" ? "看词选音标" : "听音选音标";
  const total = quiz.questions.length;

  if (quiz.phase === "done") {
    return (
      '<section class="sheet quiz-done"><h2 class="section-label">' +
      (lesson ? esc(lesson.title) + " · 练习结束" : "本轮结束") +
      '</h2><p class="score">' +
      quiz.correctCount +
      " / " +
      total +
      '</p><p class="' +
      (quiz.correctCount === total ? "ok-text" : "muted") +
      '">' +
      (quiz.correctCount === total
        ? "全部答对。"
        : "错的地方可以回上面再听一遍，也可以再练一次。") +
      '</p><div class="actions center wrap">' +
      '<button type="button" class="text-btn" data-action="retry-quiz">再练一次</button>' +
      (lesson
        ? '<button type="button" class="text-btn" data-action="quit-quiz">回本课内容</button>'
        : "") +
      '<button type="button" class="text-btn" data-action="goto" data-view="lessons">回课程</button>' +
      "</div></section>"
    );
  }

  return (
    '<section class="sheet quiz"><div class="quiz-head"><h2 class="section-label">' +
    esc(title) +
    " · " +
    (quiz.index + 1) +
    " / " +
    quiz.questions.length +
    '</h2><button type="button" class="text-btn" data-action="quit-quiz">退出</button></div>' +
    questionPromptHtml(question, quiz) +
    choicesHtml(question, quiz) +
    feedbackHtml(question, quiz) +
    revealExtraHtml(question, quiz) +
    '<div class="actions center">' +
    (quiz.revealed
      ? '<button type="button" class="cta" data-action="next-question">' +
        (quiz.index + 1 === quiz.questions.length ? "看结果" : "下一题") +
        "</button>"
      : '<button type="button" class="cta" data-action="reveal"' +
        (quiz.picked ? "" : ' disabled="disabled"') +
        ">揭晓答案</button>") +
    "</div></section>"
  );
}

function revealExtraHtml() {
  return "";
}

function quizIntroHtml() {
  const learned = learnedIds().filter((id) => byId[id]).length;
  return (
    '<section class="sheet"><h2 class="section-label">自由练习</h2><p class="how">从学过的 ' +
    learned +
    ' 个音里出十道题。先选答案，再点“揭晓”，题干不印音标。</p><p>看词选音标：单词的划线部分读哪个音。听音选音标：先听一个音，再选出来。</p><div class="actions wrap"><button type="button" class="cta" data-action="start-practice" data-mode="read" ' +
    (learned < 4 ? 'disabled="disabled"' : "") +
    '>看词选音标</button><button type="button" class="cta ghost" data-action="start-practice" data-mode="listen" ' +
    (learned < 4 ? 'disabled="disabled"' : "") +
    ">听音选音标</button></div>" +
    (learned < 4
      ? '<p class="letters">至少先点过 4 个音（在「课程」或「音标表」里点大音标），这里才能凑齐选项。先去听几个音吧。<button type="button" class="text-btn" data-action="goto" data-view="lessons">去课程</button></p>'
      : "") +
    "</section>"
  );
}

function quizHtml() {
  if (!state.quiz) return quizIntroHtml();
  return quizCardHtml();
}

/* ---------------- 易混 ---------------- */

function pairsHtml() {
  const pair = pairs[state.pairIndex];
  const card = (side) => {
    const item = byId[side.phonemeId];
    return (
      '<article class="pair-card"><button type="button" class="pair-symbol ipa ' +
      item.kind +
      '" data-action="play-sound" data-id="' +
      item.id +
      '">' +
      esc(item.symbol) +
      '</button><button type="button" class="pair-word" data-action="play-word" data-word="' +
      esc(side.word) +
      '">' +
      esc(side.word) +
      '</button><div class="meta"><span class="ipa">' +
      esc(side.ipa) +
      "</span> · " +
      esc(side.zh) +
      "</div></article>"
    );
  };
  const nav = pairs
    .map((item, index) => {
      const left = byId[item.left.phonemeId].symbol;
      const right = byId[item.right.phonemeId].symbol;
      return (
        '<button type="button" class="pair-chip' +
        (index === state.pairIndex ? " active" : "") +
        '" data-action="pair" data-index="' +
        index +
        '"><span class="ipa">' +
        esc(left) +
        " " +
        esc(right) +
        "</span></button>"
      );
    })
    .join("");
  return (
    '<div class="pair-layout"><p class="how">选一组，两个音会先后响。点音标听这个音，点单词听整词。</p><div class="pair-nav">' +
    nav +
    '</div><div class="pair-stage">' +
    card(pair.left) +
    card(pair.right) +
    '</div><p class="note"><strong>' +
    esc(pairAsks[state.pairIndex]) +
    "</strong> " +
    esc(pair.note) +
    '</p><div class="actions wrap"><button type="button" class="text-btn" data-action="replay-pair">再听两个音</button><button type="button" class="text-btn" data-action="speak-pair">再听两个词</button></div></div>'
  );
}

/* ---------------- 进度（先隐藏，代码保留） ----------------

function progressHtml() {
  const seen = phonemes.filter((item) => row(item.id)).length;
  const finished = lessons.filter((lesson) => isLessonDone(lesson.id)).length;
  const next = nextLesson();
  const list = phonemes
    .map((item) => {
      const current = row(item.id);
      const looked = current && current.seen;
      return (
        '<div class="progress-row"><button type="button" class="symbol-btn ' +
        item.kind +
        '" data-action="open-progress" data-id="' +
        item.id +
        '"><span class="ipa">' +
        esc(item.symbol) +
        '</span></button><div class="bar' +
        (looked ? "" : " idle") +
        '"><span style="width:' +
        (looked ? 100 : 0) +
        '%"></span></div><small>' +
        (looked ? "已看过" : "未看") +
        "</small></div>"
      );
    })
    .join("");
  const where =
    storageMode() === "sqlite"
      ? "进度写在本机 SQLite 里。"
      : "进度保存在这台电脑的浏览器里。";
  return (
    '<section class="sheet"><div class="progress-head"><h2 class="section-label">本机课堂记录</h2><button type="button" class="text-btn" data-action="reset">清空本机记录</button></div><div class="stats"><div><strong>' +
    finished +
    "/" +
    lessons.length +
    '</strong><span>已讲课</span></div><div><strong>' +
    seen +
    '/48</strong><span>点过的音</span></div></div><p class="how">下一课：' +
    esc(next.title) +
    '</p><p class="letters">' +
    where +
    " 只记这台电脑讲到哪一课，不记学生，也不做题打卡。</p><div class=\"progress-list\">" +
    list +
    "</div></section>"
  );
}

*/

function aboutHtml() {
  return (
    '<section class="sheet about"><h2 class="section-label">关于</h2><p class="how">音标学习 0.1.0</p><p>作者：任凯歌<br><a href="mailto:renkaige6735@163.com">renkaige6735@163.com</a></p><p>不用联网，不用登录，也不收集信息。软件不录音，也不打分。</p><div class="about-open"><h3 class="mini">开源</h3><p>这个软件开源。代码用 MIT 协议，谁都可以看、改、转发，保留版权声明就行。</p><p>代码仓库<br><a href="https://github.com/renkaige5/phoneticSymbols" target="_blank" rel="noopener noreferrer">https://github.com/renkaige5/phoneticSymbols</a></p><p class="letters">这份协议只管程序代码。字体和录音还按原来的许可使用。</p></div><h3 class="mini">字体和声音</h3><p>音标字体是 Charis SIL，按 SIL Open Font License 使用。许可证原文在软件里的 fonts/OFL.txt。</p><p>每个音、字母名和例词的声音都在软件里，不用电脑自带的语音。48 个音里，tr、dr、ts、dz 是课本单独列出的，其实是两个辅音连着读。</p><p>音标数据来源：新东方国际音标卡片<br><a href="https://www.xdf.cn/zhuanti/bd-phonetic-alphabet-card/index.html" target="_blank" rel="noopener noreferrer">https://www.xdf.cn/zhuanti/bd-phonetic-alphabet-card/index.html</a></p><p>字母名录音来源：新东方26个英文字母表<br><a href="https://www.xdf.cn/zhuanti/bd_letter_card/index.html" target="_blank" rel="noopener noreferrer">https://www.xdf.cn/zhuanti/bd_letter_card/index.html</a></p><div class="actions"><button type="button" class="text-btn" data-action="reset">清除这台电脑的记录</button><button type="button" class="text-btn" data-action="goto" data-view="lessons">回课程</button></div></section>'
  );
}

function stageHtml() {
  if (state.view === "about") return aboutHtml();
  if (state.view === "lessons") return lessonsListHtml();
  if (state.view === "lesson") return lessonHtml();
  if (state.view === "learn") return learnHtml();
  if (state.view === "pairs") return pairsHtml();
  if (state.view === "quiz") return quizHtml();
  // return progressHtml();
  return lessonsListHtml();
}

function toolButton(action, label, on) {
  return (
    '<button type="button" class="text-btn' +
    (on ? " active" : "") +
    '" data-action="' +
    action +
    '">' +
    label +
    "</button>"
  );
}

function render() {
  const tabs = views
    .map((view) => {
      const active = state.view === view[0] || (view[0] === "lessons" && state.view === "lesson");
      return (
        '<button type="button" class="' +
        (active ? "active" : "") +
        '" data-action="goto" data-view="' +
        view[0] +
        '">' +
        view[1] +
        "</button>"
      );
    })
    .join("");
  app.innerHTML =
    '<main class="app"><header class="top"><div><h1 class="brand">音标学习 <span class="ipa">ə</span></h1>' +
    // '<p class="subtitle">教师课堂 · 完全离线 · 不用麦克风</p>' +
    '</div><div class="toolbar">' +
    toolButton("toggle-classmode", "课堂大字", state.classmode) +
    toolButton("fullscreen", "全屏", false) +
    toolButton("toggle-loop", state.loop3 ? "循环 3 遍：开" : "循环 3 遍", state.loop3) +
    toolButton("goto-about", "关于", state.view === "about") +
    '</div></header><nav class="tabs">' +
    tabs +
    '</nav><div id="stage">' +
    stageHtml() +
    "</div></main>";
  document.body.classList.toggle("classmode", !!state.classmode);
}

function refreshChartSelection() {
  document.querySelectorAll("[data-action='select'], [data-action='open-progress']").forEach((button) => {
    button.classList.toggle("selected", button.dataset.id === state.selectedId);
  });
}

function replaceChart() {
  const chart = document.querySelector("#chart");
  if (!chart) return;
  const y = window.pageYOffset || document.documentElement.scrollTop || 0;
  chart.innerHTML = chartHtml();
  refreshChartSelection();
  window.scrollTo(0, y);
}

function selectPhoneme(id) {
  const item = byId[id];
  if (!item) return;
  state.selectedId = id;
  markSeen(id);
  if (state.view !== "learn") {
    state.view = "learn";
    render();
  } else {
    const detail = document.querySelector("#detail");
    if (detail) detail.innerHTML = detailHtml();
    replaceChart();
  }
  playPhoneme(id, state.loop3 ? 3 : 1);
}

function startLessonQuiz() {
  const lesson = lessonById(state.lessonId);
  if (!lesson) return;
  state.quiz = makeLessonQuiz(lesson);
  render();
  autoPlayQuestion();
  scrollTop();
}

function autoPlayQuestion() {
  const quiz = state.quiz;
  if (!quiz || quiz.phase !== "ask") return;
  const question = currentQuestion();
  if (!question) return;
  if (question.kind === "sound") playPhoneme(question.phonemeId);
  if (question.kind === "letter") playLetter(question.letter);
  if (question.kind === "word") playWord(question.word);
}

function choose(id) {
  const quiz = state.quiz;
  const question = currentQuestion();
  if (!quiz || !question || quiz.revealed || quiz.phase !== "ask") return;
  quiz.picked = id;
  render();
}

function revealQuiz() {
  const quiz = state.quiz;
  const question = currentQuestion();
  if (!quiz || !question || quiz.phase !== "ask" || quiz.revealed) return;
  if (!quiz.picked) {
    showToast("先选一个答案，再揭晓");
    return;
  }
  quiz.revealed = true;
  const correct = quiz.picked === quizTarget(question);
  if (correct) quiz.correctCount += 1;
  if (question.phonemeId) recordAnswer(question.phonemeId, correct);
  render();
  if (question.kind === "read" || question.kind === "word") playWord(question.word);
  if (question.kind === "letter") playLetter(question.letter);
  if (question.kind === "sound") playPhoneme(question.phonemeId, state.loop3 ? 3 : 1);
}

function nextQuestion() {
  const quiz = state.quiz;
  if (!quiz) return;
  if (quiz.index + 1 >= quiz.questions.length) {
    quiz.phase = "done";
    render();
    scrollTop();
    return;
  }
  quiz.index += 1;
  quiz.picked = null;
  quiz.revealed = false;
  render();
  autoPlayQuestion();
  scrollTop();
}

function retryQuiz() {
  const old = state.quiz;
  if (!old) return;
  if (old.mode === "lesson") {
    startLessonQuiz();
  } else {
    state.quiz = makePractice(old.mode);
    render();
    autoPlayQuestion();
  }
}

function scrollTop() {
  try {
    window.scrollTo(0, 0);
  } catch (error) {
    /* 老浏览器忽略 */
  }
}

function scrollToCurrentLesson() {
  const row = document.querySelector(".lesson-row.current");
  if (!row) {
    scrollTop();
    return;
  }
  try {
    row.scrollIntoView({ block: "center" });
  } catch (error) {
    row.scrollIntoView(true);
  }
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === "chart-mode") {
    state.chartMode = button.dataset.mode === "place" ? "place" : "list";
    const modes = document.querySelector(".chart-modes");
    if (modes) {
      const buttons = modes.querySelectorAll("[data-action='chart-mode']");
      for (let index = 0; index < buttons.length; index += 1) {
        buttons[index].classList.toggle("active", buttons[index].dataset.mode === state.chartMode);
      }
    }
    replaceChart();
  } else if (action === "goto") {
    const wasLessons = state.view === "lessons";
    state.view = button.dataset.view;
    if (state.view !== "lesson") state.quiz = state.quiz && state.quiz.practice ? state.quiz : null;
    if (state.view === "quiz") state.quiz = null;
    render();
    if (state.view === "lessons" && state.lessonId && !wasLessons) scrollToCurrentLesson();
    else scrollTop();
  } else if (action === "open-lesson") {
    state.lessonId = button.dataset.id;
    setPref("lastLessonId", state.lessonId);
    state.view = "lesson";
    state.lessonView = "cards";
    state.quiz = null;
    render();
    scrollTop();
  } else if (action === "mark-done") {
    if (state.lessonId) markLessonDone(state.lessonId);
    state.view = "lessons";
    state.quiz = null;
    render();
    scrollToCurrentLesson();
  } else if (action === "toggle-classmode") {
    state.classmode = !state.classmode;
    setPref("classmode", state.classmode);
    render();
    showToast(state.classmode ? "课堂大字已打开，适合投影" : "已回到普通字号");
  } else if (action === "toggle-loop") {
    state.loop3 = !state.loop3;
    setPref("loop3", state.loop3);
    render();
    showToast(state.loop3 ? "点一下会连放 3 遍" : "点一下只放 1 遍");
  } else if (action === "fullscreen") {
    toggleFullscreen();
  } else if (action === "goto-about") {
    state.view = "about";
    render();
    scrollTop();
  } else if (action === "volume-ok") {
    state.volumeOk = true;
    setPref("volumeOk", true);
    render();
  } else if (action === "print-tip") {
    window.print();
  } else if (action === "start-lesson-quiz") {
    startLessonQuiz();
  } else if (action === "start-practice") {
    const quiz = makePractice(button.dataset.mode);
    if (!quiz) return;
    state.quiz = quiz;
    state.view = "quiz";
    render();
    autoPlayQuestion();
  } else if (action === "retry-quiz") {
    retryQuiz();
  } else if (action === "quit-quiz") {
    state.quiz = null;
    if (state.view === "quiz") state.view = "lessons";
    render();
  } else if (action === "answer") {
    choose(button.dataset.id);
  } else if (action === "reveal") {
    revealQuiz();
  } else if (action === "next-question") {
    nextQuestion();
  } else if (action === "select" || action === "open-progress") {
    selectPhoneme(button.dataset.id);
  } else if (action === "play-phoneme" || action === "play-sound") {
    const id = button.dataset.id;
    markSeen(id);
    playPhoneme(id, button.dataset.times ? Number(button.dataset.times) : state.loop3 ? 3 : 1);
  } else if (action === "play-letter") {
    playLetter(button.dataset.letter, state.loop3 ? 3 : 1);
    const soundId = (letterByName[button.dataset.letter] || {}).soundIds;
    if (soundId && soundId[0]) markSeen(soundId[0]);
  } else if (action === "play-word") {
    playWord(
      button.dataset.word,
      button.dataset.slow === "1",
      state.loop3 ? 3 : 1,
      button.dataset.rate ? Number(button.dataset.rate) : 0,
    );
  } else if (action === "replay") {
    const question = currentQuestion();
    if (!question) return;
    if (question.kind === "sound") playPhoneme(question.phonemeId);
    if (question.kind === "letter") playLetter(question.letter);
    if (question.kind === "word") playWord(question.word);
    if (question.kind === "read") playWord(question.word);
  } else if (action === "blend") {
    const entry = blendWords.find((item) => item.word === button.dataset.word);
    if (!entry) return;
    const card = button.closest("[data-blend-card]");
    const spans = card ? card.querySelectorAll(".blend-part") : [];
    playBlend(entry.parts, entry.word, (index) => {
      spans.forEach((span, i) => {
        if (index < entry.parts.length) span.className = "blend-part ipa" + (i === index ? " on" : "");
        else span.className = "blend-part ipa on";
      });
    }, state.loop3 ? 3 : 1);
  } else if (action === "speak-pair") {
    const pair = pairs[state.pairIndex];
    playWords([pair.left.word, pair.right.word], state.loop3 ? 3 : 1);
  } else if (action === "replay-pair" || action === "pair") {
    const index = action === "replay-pair" ? state.pairIndex : Number(button.dataset.index);
    state.pairIndex = index;
    render();
    const pair = pairs[index];
    playPhonemes([pair.left.phonemeId, pair.right.phonemeId], null, state.loop3 ? 3 : 1);
  } else if (action === "reset") {
    if (window.confirm("清除这台电脑上的上课记录？课的内容不会删。")) {
      resetProgress().then(render);
    }
  }
});

app.addEventListener("input", (event) => {
  if (event.target.id !== "q") return;
  state.query = event.target.value;
  replaceChart();
});

/* 做题时 1–4 只选择，回车才揭晓。翻页留给页面自己滚动，方便老师往下讲。 */
document.addEventListener("keydown", (event) => {
  const tag = event.target && event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (!state.quiz || state.quiz.phase !== "ask" || state.view !== "quiz") return;
  if (event.key === "Enter") {
    event.preventDefault();
    if (!state.quiz.revealed) revealQuiz();
    else nextQuestion();
    return;
  }
  if (state.quiz.revealed) return;
  const question = currentQuestion();
  if (!question) return;
  const index = Number(event.key) - 1;
  if (index < 0 || index >= question.options.length) return;
  choose(question.options[index]);
});

function showToast(text) {
  let el = document.querySelector("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.className = "show";
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    el.classList.remove("show");
  }, 3200);
}

function toggleFullscreen() {
  const doc = document;
  const active = doc.fullscreenElement || doc.webkitFullscreenElement;
  if (active) {
    const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
    if (exit) exit.call(doc);
    return;
  }
  const el = doc.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req) {
    const result = req.call(el);
    if (result && result.catch) result.catch(() => showToast("全屏没打开，按 F11 也可以"));
  } else {
    showToast("按 F11 可以全屏");
  }
}

onAudio((type, name) => {
  document.querySelectorAll(".is-playing").forEach((el) => el.classList.remove("is-playing"));
  if (type === "playing") {
    document.querySelectorAll("[data-id]").forEach((el) => {
      if (el.getAttribute("data-id") === name) el.classList.add("is-playing");
    });
  }
  if (type === "error") showToast("这个声音没有播出来。请看音响是否打开、音量是否太小。");
  if (type === "blocked") showToast("点一下页面后再播放。");
});

initStore().then(() => {
  const prefs = classPrefs();
  state.classmode = !!prefs.classmode;
  state.loop3 = !!prefs.loop3;
  state.volumeOk = !!prefs.volumeOk;
  if (lessonById(prefs.lastLessonId)) state.lessonId = prefs.lastLessonId;
  render();
  if (state.view === "lessons" && state.lessonId) scrollToCurrentLesson();
});
