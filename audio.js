// 會幕拆卸 —— 音效與背景音樂(零音檔,Web Audio 現算)
//
// 照 tsum 七款的做法(skill sfx-kit / procedural-bgm):
//   · 音效 = 一顆振盪器 + gain 包封,一次性
//   · BGM  = look-ahead 排程器(每次多排 0.45 秒),固定旋律走五聲音階 + 每 8 步一個低音
//   ★ 為什麼不用音檔:離線可用、零下載、不佔 git;而且**人聲一律預烤 mp3**(見 tts.js),
//     這裡只放樂音與音效,不唸字。
//
// ⚠ 手機/瀏覽器規定:AudioContext 一定要「使用者動過畫面」之後才能開,
//   所以 ensure() 只在點擊時呼叫;沒開成功就安靜地不出聲(不能讓遊戲因為音訊掛掉)。
const MUTE_KEY = 'bgm-muted';        // 與 tsum 七款共用同一個鍵:一款關了,別款也記得

let ctx = null, bgmGain = null, bgmOn = false, nextAt = 0, step = 0, timer = 0;
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* 私密模式 */ }

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.9;
    bgmGain.connect(ctx.destination);
  } catch { ctx = null; }
  return ctx;
}

/** 一次性音效 */
function tone(freq, dur, delay = 0, type = 'triangle', vol = 0.12) {
  const c = ensure();
  if (!c || muted) return;
  try {
    const at = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(c.destination);
    o.start(at); o.stop(at + dur + 0.03);
  } catch { /* 音訊掛了也不能影響遊戲 */ }
}

// ── 音效表(每個都對得上畫面上發生的事)──
export const sfx = {
  pull:   () => { tone(520, 0.07, 0, 'triangle', 0.10); tone(300, 0.10, 0.03, 'sine', 0.07); }, // 拔起橛子:短「叩」
  bin:    () => tone(660, 0.09, 0, 'sine', 0.09),                                               // 放進擔子
  carry:  () => { [523, 659, 784].forEach((f, i) => tone(f, 0.16, i * 0.07, 'triangle', 0.11)); }, // 滿三根,利未人扛走
  fall:   () => { tone(180, 0.22, 0, 'sawtooth', 0.07); tone(120, 0.3, 0.05, 'sine', 0.06); },  // 板子掉落
  locked: () => tone(160, 0.12, 0, 'square', 0.05),                                             // 點到還被壓著的
  win:    () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, i * 0.11, 'triangle', 0.12)); },
  stuck:  () => { tone(330, 0.18, 0, 'sine', 0.08); tone(247, 0.3, 0.12, 'sine', 0.08); },
  tap:    () => tone(700, 0.05, 0, 'sine', 0.06),                                               // 按鈕
};

// ── 背景音樂:曲庫制(BGM 百曲庫 0726)──
//
// ★ 使用者拍板:全艦隊 94 站的 BGM 不能都一樣、同一款遊戲**每一關也要不同曲**。
//   做法:曲子由 (站名, 關卡id) 的雜湊決定 —— 8 音階 × 8×8 樂句 × 4 速度 × 移調 ×(波形)
//   組合上萬,同一關永遠同一首(可迴歸),不同關/不同站一定不同首。
// ★ 音高與音量是量出來的,不是憑感覺(2026-07-26):
//   AnalyserNode 實測舊寫法 RMS −36.5 dBFS、能量最強 188 Hz——手機喇叭放不出 500 Hz 以下,
//   等於沒有。所以旋律一律 330 Hz 以上、triangle/sine、音量拉到量得到(峰值 ≥ −10 dBFS)。
// ★ 這款是會幕(敬拜的地方):速度取偏慢的一組、不用 square(太電玩)。
const SCALES = [
  [523.25, 587.33, 659.25, 783.99, 880.00],   // C 大五聲
  [440.00, 523.25, 587.33, 659.25, 783.99],   // A 小五聲
  [392.00, 440.00, 493.88, 587.33, 659.25],   // G
  [349.23, 392.00, 440.00, 523.25, 587.33],   // F
  [587.33, 659.25, 739.99, 880.00, 987.77],   // D
  [329.63, 392.00, 440.00, 493.88, 587.33],   // Em
  [466.16, 523.25, 587.33, 698.46, 783.99],   // Bb
  [415.30, 466.16, 554.37, 622.25, 739.99],   // Ab
];
const PHRASES = [
  [0, 1, 2, 3, 4, 3, 2, 1], [0, 2, 4, 2, 1, 3, 2, 0], [4, 3, 2, 1, 0, 1, 2, 3], [0, 0, 2, 2, 4, 4, 2, -1],
  [0, 2, 1, 3, 2, 4, 3, -1], [4, 2, 0, 2, 4, 2, 1, 0], [0, 3, 1, 4, 2, 0, 3, -1], [2, 4, 2, 0, 1, 3, 4, 2],
];
const TEMPI = [0.38, 0.44, 0.50, 0.56];        // 敬拜感:全體偏慢
const WAVES = ['triangle', 'sine'];

/** 由 (站名|關卡) 算出一首曲子;同一把鑰匙永遠同一首 */
function variant(key) {
  let x = 2166136261;
  const s = 'tabernacle-screw|' + key;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; }
  const mul = [1, 1.122, 0.891][(x >>> 13) % 3];                 // 移調 ±2 半音
  const scale = SCALES[x % SCALES.length].map((f) => +(f * mul).toFixed(2));
  const mel = PHRASES[(x >>> 3) % 8].concat(PHRASES[(x >>> 6) % 8]);   // 兩句拼成 16 步
  const wave = WAVES[(x >>> 11) % WAVES.length];
  return { scale, mel, wave,
           step: TEMPI[(x >>> 9) % TEMPI.length],
           vol: wave === 'sine' ? 0.45 : 0.35,
           bass: [+(scale[0] / 2).toFixed(2), +(scale[3] / 2).toFixed(2)] };
}
let cur = variant('menu');                     // 開場(選單/地圖)自己也有一首

/** 換曲(進某一關時呼叫,傳關卡 id);同關永遠同曲 */
export function setTrack(key) {
  cur = variant(key || 'menu');
  step = 0;
  if (ctx) nextAt = Math.max(nextAt, ctx.currentTime + 0.1);
}

const BASS_EVERY = 8;

function note(freq, dur, at, type, peak) {
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(bgmGain);
    o.start(at); o.stop(at + dur + 0.05);
  } catch { /* noop */ }
}

function tick() {
  if (!bgmOn || muted || !ctx) return;
  const ahead = ctx.currentTime + 0.45;
  let guard = 0;
  while (nextAt < ahead && guard++ < 64) {
    const i = cur.mel[step % cur.mel.length];
    if (i >= 0) note(cur.scale[i], cur.step * 0.92, nextAt, cur.wave, cur.vol);
    if (step % BASS_EVERY === 0)
      note(cur.bass[Math.floor(step / BASS_EVERY) % cur.bass.length], cur.step * BASS_EVERY * 0.9, nextAt, 'sine', 0.02);
    nextAt += cur.step;
    step++;
  }
}

/** 開始播(要在使用者點擊後呼叫才會有聲音) */
export function startBgm() {
  if (bgmOn || muted) return;
  const c = ensure();
  if (!c) return;
  try { c.resume?.(); } catch { /* noop */ }
  bgmOn = true;
  nextAt = c.currentTime + 0.1;
  tick();
  timer = setInterval(tick, 200);
}

export function stopBgm() {
  bgmOn = false;
  if (timer) { clearInterval(timer); timer = 0; }
}

export const isMuted = () => muted;

/** 靜音開關(音效與音樂一起) */
export function setMuted(v) {
  muted = !!v;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* noop */ }
  if (muted) stopBgm(); else startBgm();
  return muted;
}
