// 朗讀 runtime —— 預烤 mp3 曉臻神經人聲。
// ★ 系列鐵律(baked-voice-commentary):固定句一律預烤 mp3,**絕不用 Web Speech 機器聲**。
//   缺檔就不唸(靜默),沒有任何 Web Speech fallback——寧可不出聲,也不出機器聲。
// key 與 scripts/gen-tts.mjs 共用同一支 ttsKey,字串差一個字就對不上。

export function ttsKey(text) {
  const s = String(text).replace(/\s+/g, '');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

// ── 經文出處要唸成「第四章第二十五節」,不能唸成「四點二十五分」 ──
// 🐛 2026-07-25 使用者實測:「民數記 4:25」被 TTS 唸成「4 點 25 分」。
// 冒號在中文語音引擎眼中是時間格式。照 hfpc-paul-game 的慣例:章節轉國字 + 明講「第…章第…節」。
// ★ 這支同時給 runtime 與烤製腳本用——唸的字串要一模一樣,key 才對得上。
const ZH = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function numToZh(n) {
  if (n < 10) return ZH[n];
  if (n < 20) return '十' + (n % 10 ? ZH[n % 10] : '');
  if (n < 100) return ZH[Math.floor(n / 10)] + '十' + (n % 10 ? ZH[n % 10] : '');
  const rem = n % 100;
  return ZH[Math.floor(n / 100)] + '百' + (rem === 0 ? '' : rem < 10 ? '零' + ZH[rem] : numToZh(rem));
}
/** 「民數記 4:25」→「民數記第四章第二十五節」;「民數記 4:5-6」→「民數記第四章第五到六節」 */
export function refSpoken(ref) {
  const m = /^(.+?)\s*(\d+)\s*[:：]\s*(\d+)(?:\s*[-–—~]\s*(\d+))?\s*$/.exec(String(ref).trim());
  if (!m) return String(ref).trim();
  const [, book, ch, v1, v2] = m;
  return `${book}第${numToZh(+ch)}章第${numToZh(+v1)}${v2 ? `到${numToZh(+v2)}` : ''}節`;
}
/** 一關要唸的完整句子(出處唸法 + 經文);runtime 與烤製共用,不可分歧 */
export const verseLine = (ref, verse) => `${refSpoken(ref)}。${verse}`;

/**
 * 唸出前的最後一道處理:把**句子裡任何殘留的** 章:節 也轉成國字唸法。
 * 例:提示句「…(民 4:15「不可摸聖物」)」→「…(民第四章第十五節「不可摸聖物」)」
 * ★ 烤製與 runtime 都要先過這一支再算 key,否則字串不同 → 對不上 → 缺檔不唸。
 * ★ 只動「唸給引擎聽的字串」,畫面顯示的經文永遠不變(paul-game ttsFix 同款鐵則)。
 */
export function toSpeakable(text) {
  return String(text).replace(/(\d+)\s*[:：]\s*(\d+)(?:\s*[-–—~]\s*(\d+))?/g,
    (_, c, v1, v2) => `第${numToZh(+c)}章第${numToZh(+v1)}${v2 ? `到${numToZh(+v2)}` : ''}節`);
}

const VOICE_PREF = 'tabernacle-screw-voice';
let manifest = null;
let current = null;

export function voiceOn() {
  try { return localStorage.getItem(VOICE_PREF) !== 'off'; } catch { return true; }
}
export function setVoiceOn(on) {
  try { localStorage.setItem(VOICE_PREF, on ? 'on' : 'off'); } catch { /* 私密模式 */ }
  if (!on) stopSpeak();
}

async function load() {
  if (manifest) return manifest;
  try {
    const r = await fetch('./tts/manifest.json', { cache: 'force-cache' });
    manifest = r.ok ? await r.json() : {};
  } catch { manifest = {}; }
  return manifest;
}

export function stopSpeak() {
  if (current) { try { current.pause(); } catch { /* noop */ } current = null; }
}

/** 唸一句固定句。有烤好的 mp3 才唸;沒有就靜默(不退回機器聲)。 */
export async function speak(text) {
  if (!voiceOn() || !text) return;
  const m = await load();
  const src = m[ttsKey(toSpeakable(text))];   // 與烤製同一套:先轉唸法再算 key
  if (!src) return;                 // 缺檔=不唸(鐵則)
  stopSpeak();
  try {
    const a = new Audio(src);
    current = a;
    a.onended = () => { if (current === a) current = null; };
    await a.play();
  } catch { /* 自動播放被擋/離線缺檔:安靜跳過 */ }
}
