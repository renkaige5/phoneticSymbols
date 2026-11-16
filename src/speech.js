/**
 * 发音层：全部音频都预先生成、随软件打包，不依赖系统语音、不联网。
 * - 单音：/audio/<id>.mp3（预先生成，播放音量固定为最大）
 * - 例词：/audio/w-<word>.mp3。慢速 mp3（w-<word>-slow.mp3）仍保留。
 * - 按钮带 rate 时播正常 mp3，并用 playbackRate 放慢（音调保持）。
 * - 不带 rate 的慢速仍播 w-<word>-slow.mp3，方便还原。
 * - 字母名：/audio/l-<A>.mp3
 * 单文件版会先注入 window.__AUDIO__（base64 映射），此文件自动优先使用。
 */

let current = null;
let seqToken = 0;
let pendingTimer = 0;
const hooks = [];

export function onAudio(fn) {
  hooks.push(fn);
}

function emit(type, name) {
  hooks.forEach((fn) => {
    try {
      fn(type, name);
    } catch (error) {
      /* 界面回调失败不影响播放 */
    }
  });
}

function slug(word) {
  return String(word).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function url(name) {
  const map = typeof window !== "undefined" ? window.__AUDIO__ : null;
  if (map && map[name]) return map[name];
  return "audio/" + name + ".mp3";
}

export function stopAudio() {
  seqToken += 1;
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = 0;
  }
  if (current) {
    current.pause();
    current = null;
  }
}

function repeatList(names, times) {
  const n = times && times > 1 ? Math.floor(times) : 1;
  const out = [];
  for (let round = 0; round < n; round += 1) {
    for (let index = 0; index < names.length; index += 1) out.push(names[index]);
  }
  return out;
}

function playOne(name, onDone, rate) {
  const audio = new Audio(url(name));
  audio.volume = 1;
  const speed = Number(rate);
  if (speed > 0 && speed !== 1) {
    audio.preservesPitch = true;
    audio.playbackRate = speed;
  }
  current = audio;
  let advanced = false;
  const next = () => {
    if (advanced) return;
    advanced = true;
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = 0;
    }
    if (onDone) onDone();
  };
  const arm = () => {
    if (advanced || pendingTimer) return;
    const duration = audio.duration;
    const playback = audio.playbackRate || 1;
    const ms = ((duration && isFinite(duration) ? duration : 1.5) / playback) * 1000 + 150;
    pendingTimer = setTimeout(next, ms);
  };
  audio.onended = next;
  audio.onerror = () => {
    emit("error", name);
    next();
  };
  audio.onplaying = () => {
    emit("playing", name);
    arm();
  };
  const promise = audio.play();
  if (promise && promise.catch) {
    promise.catch(() => {
      if (advanced) return;
      emit("blocked", name);
      next();
    });
  }
  return audio;
}

/** 顺序播放一串音频，播完一个再播下一个。 */
export function playSequence(names, onEach, rate) {
  if (!names || !names.length) return;
  stopAudio();
  const token = seqToken;
  let index = 0;
  const step = () => {
    if (token !== seqToken) return;
    if (index >= names.length) {
      emit("ended", "");
      return;
    }
    const name = names[index];
    if (onEach) onEach(index);
    index += 1;
    playOne(name, step, rate);
  };
  step();
}

export function playPhoneme(id, times) {
  playSequence(repeatList([id], times));
}

export function playPhonemes(ids, onEach, times) {
  playSequence(repeatList(ids.filter(Boolean), times), onEach);
}

export function playWord(word, slow, times, rate) {
  const speed = Number(rate);
  const useRate = slow && speed > 0 && speed < 1;
  // 没传 rate 时继续用预先生成的慢速文件，那些 mp3 先留着。
  const name = "w-" + slug(word) + (slow && !useRate ? "-slow" : "");
  playSequence(repeatList([name], times), null, useRate ? speed : 1);
}

export function playWords(words, times) {
  playSequence(repeatList(words.map((word) => "w-" + slug(word)), times));
}

/** 先逐个音，再整词。用于「拼一拼」。 */
export function playBlend(parts, word, onEach, times) {
  const once = parts.concat(["w-" + slug(word)]);
  playSequence(repeatList(once, times), (index) => {
    if (onEach) onEach(index % once.length);
  });
}

export function playLetter(letter, times) {
  playSequence(repeatList(["l-" + letter], times));
}
