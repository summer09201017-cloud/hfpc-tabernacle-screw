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
  const src = m[ttsKey(text)];
  if (!src) return;                 // 缺檔=不唸(鐵則)
  stopSpeak();
  try {
    const a = new Audio(src);
    current = a;
    a.onended = () => { if (current === a) current = null; };
    await a.play();
  } catch { /* 自動播放被擋/離線缺檔:安靜跳過 */ }
}
