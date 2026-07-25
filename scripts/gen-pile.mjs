#!/usr/bin/env node
// 會幕拆卸 —— 堆疊佈局產生器 v2(npm run tune)
//
// 為每一關隨機搜「中央堆疊」佈局(不規則多邊形、全部疊在中間),硬篩五關卡:
//   ① 板件都在舞台內、都擠在中央(不是分欄)      ② 螺絲都在自己那片的形狀裡、間距 ≥ MIN_SPACING
//   ③ 經文次序 under 約束(例:法櫃的卯全被幔子蓋住) ④ 三個年齡檔各「保證可解」
//   ⑤ 難度落在分齡目標帶(青少年 12~40% 卡死且躺平 ≥25%;兒童 ≤25%;幼幼 ≤10%;教學關除外)
// 找到就把佈局寫回 levels.js 的 ⟪PILES⟫ 區段(手改無效,重跑本工具會覆蓋)。
//
// 跑法:node scripts/gen-pile.mjs [--level veil] [--tries 30000] [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { RAW, binsFor, AGE } from '../levels.js';
import { makePoly, tightestSpacing, norm, L } from '../layout.js';
import { indexLevel, initState, exposedScrews, removeScrew, isWon, cloneState, stateKey, pointInPoly } from '../rules.js';

const args = process.argv.slice(2);
const argOf = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const ONLY = argOf('level', null);
const TRIES = +argOf('tries', 30000);
const DRY = args.includes('--dry');

// ★ 0726 使用者玩過第一版堆疊後說「還要再加難度」→ 目標帶整段上移:
//   青少年 12~40% → 30~55%(想一下也常失手);兒童放寬到 ≤30%(可以偶爾卡);幼幼仍幾乎不卡
const BAND = { teen: { min: 0.30, max: 0.55, randMin: 0.5 }, kids: { max: 0.30 }, kinder: { max: 0.10 } };

// 種子隨機:每個 try 一顆種子 → 搜出來的佈局完全可重現
const lcg = (seed) => () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);

const ROT = {  // 各形體允許的旋轉範圍(rad):板/幔小斜、獸皮隨便轉、柱直立微斜、閂/繩橫放
  plate: 0.35, pillar: 0.5, bar: 0.22, base: 0.15, rope: 0.25,
};

function tryLayout(raw, rnd) {
  const n = raw.boards.length;
  const under = new Map((raw.under || []).map(([lo, ups]) => [lo, ups]));
  const boards = [];
  for (let i = 0; i < n; i++) {
    const meta = raw.boards[i];
    // ★ 有偏向的擺放:被壓的板(under 的 lower)直接生在「壓它的板」中心附近,
    //   不然純隨機要幾何上剛好互蓋,兩萬次都湊不出來(第一版就是這樣三關全掛)。
    let bias = null;
    if (under.has(meta.id)) {
      const up = boards.find((b) => under.get(meta.id).includes(b.id));
      if (up) {
        const c = up.poly.reduce((a, [x, y]) => [a[0] + x / up.poly.length, a[1] + y / up.poly.length], [0, 0]);
        bias = c;
      }
    }
    let poly = null;
    for (let attempt = 0; attempt < 40 && !poly; attempt++) {
      // 散佈 ±28/±26:片與片仍然層層交疊在中央,但聯集面積夠 18 根卯保持 15% 間距。
      // (第一版全擠 ±15,五/六站三萬次都「擺不下」——不是難度問題,是面積不夠。)
      const cx = bias ? bias[0] + (rnd() - 0.5) * 12 : 50 + (rnd() - 0.5) * 56;
      const cy = bias ? bias[1] + (rnd() - 0.5) * 10 : 52 + (rnd() - 0.5) * 52;
      const rot = (rnd() - 0.5) * 2 * (ROT[meta.shape] ?? 0.35) + (meta.mat === 'seal' || meta.mat === 'ram' ? rnd() * Math.PI : 0);
      const p = makePoly(meta.mat, meta.shape, cx, cy, rnd, rot);
      if (p.every(([x, y]) => x >= L.EDGE && x <= 100 - L.EDGE && y >= L.EDGE && y <= 100 - L.EDGE)) poly = p;
    }
    if (!poly) return null;
    boards.push({ ...meta, layer: n - i, poly });
  }

  // 螺絲:放在自己形狀「內縮後」的隨機點,全域間距 ≥ MIN_SPACING。
  // ★ 內縮依形體厚度縮放:柱/閂/繩本來就只有 3~9% 厚,套 4.5% 內縮=沒有內部可放,
  //   細長件的橛子本來就會微微凸出邊緣(現實的螺絲也是),縮 1.2% 就好。
  const INSET = { plate: L.SCREW_INSET, base: 2.5, pillar: 1.2, bar: 1.2, rope: 0.8 };
  const inPolyDeep = (x, y, poly, shape) => {
    const m = INSET[shape] ?? L.SCREW_INSET;
    return pointInPoly(x, y, poly) && pointInPoly(x - m, y, poly) && pointInPoly(x + m, y, poly) &&
           pointInPoly(x, y - m * L.STAGE_ASPECT, poly) && pointInPoly(x, y + m * L.STAGE_ASPECT, poly);
  };
  const placed = [];
  const screws = [];
  for (const s of raw.screws) {
    const b = boards.find((x) => x.id === s.board);
    // ★ 有 under 約束的板:卯直接在「自己 ∩ 壓它的板」的交集裡取點(事後才驗=永遠驗不過)
    const upPolys = (under.get(s.board) || []).map((id) => boards.find((x) => x.id === id).poly);
    let ok = null;
    for (let attempt = 0; attempt < 160 && !ok; attempt++) {
      const bb = b.poly.reduce((a, [x, y]) => ({ x0: Math.min(a.x0, x), y0: Math.min(a.y0, y), x1: Math.max(a.x1, x), y1: Math.max(a.y1, y) }),
                               { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
      const x = +(bb.x0 + rnd() * (bb.x1 - bb.x0)).toFixed(1);
      const y = +(bb.y0 + rnd() * (bb.y1 - bb.y0)).toFixed(1);
      if (!inPolyDeep(x, y, b.poly, b.shape)) continue;
      if (upPolys.length && !upPolys.some((p) => pointInPoly(x, y, p))) continue;
      if (placed.some(([px, py]) => norm(x - px, y - py) < L.MIN_SPACING)) continue;
      ok = [x, y];
    }
    if (!ok) return null;
    placed.push(ok);
    screws.push({ ...s, x: ok[0], y: ok[1] });
  }
  return { ...raw, boards, screws };
}

// ── 可解性 + 兩隻 bot(與 solver.mjs 同一套規則,rules.js 只有一份)──
function solvable(level, bins, budget = 400000) {
  const idx = indexLevel(level); const seen = new Set(); let nn = 0;
  const dfs = (st) => {
    if (isWon(st)) return true;
    if (++nn > budget) return false;
    const k = stateKey(level, st); if (seen.has(k)) return false; seen.add(k);
    for (const id of exposedScrews(idx, st)) {
      const nx = cloneState(st); if (!removeScrew(idx, nx, id).ok) continue;
      if (dfs(nx)) return true;
    }
    return false;
  };
  return dfs(initState(level, bins));
}
function bots(level, bins, runs, rnd) {
  const idx = indexLevel(level);
  const pick = (a) => a[Math.floor(rnd() * a.length) % a.length];
  const play = (p) => { const st = initState(level, bins);
    for (;;) { if (isWon(st)) return true; const ex = exposedScrews(idx, st);
      if (!ex.length) return false; if (!removeScrew(idx, st, p(ex, st)).ok) return false; } };
  let R = 0, G = 0;
  for (let i = 0; i < runs; i++) if (!play((ex) => pick(ex))) R++;
  for (let i = 0; i < runs; i++) if (!play((ex, st) => {
    const open = ex.filter((id) => st.bins.some((b) => b && b.color === idx.screw.get(id).color));
    return pick(open.length ? open : ex);
  })) G++;
  return { R: R / runs, G: G / runs };
}

function search(raw) {
  const why = { layout: 0, spacing: 0, band: 0, ageBand: 0, unsolvable: 0 };
  for (let t = 0; t < TRIES; t++) {
    const rnd = lcg(0x9e3779b9 ^ (t * 2654435761));
    const lv = tryLayout(raw, rnd);
    if (!lv) { why.layout++; continue; }
    if (tightestSpacing(lv).spacing < L.MIN_SPACING) { why.spacing++; continue; }

    // 關卡可帶自己的下限(raw.teenMin):第五站全是細長件,幾何上埋不到 30%,退而求其次
    const tMin = raw.teenMin ?? BAND.teen.min;
    const mrnd = lcg(20260726);                        // 量測用固定種子=迴歸基準
    const teen = bots(lv, binsFor(lv, 'teen'), 140, mrnd);
    if (!raw.teaching && (teen.G < tMin - 0.03 || teen.G > BAND.teen.max + 0.03)) { why.band++; continue; } // 粗篩
    const teenF = raw.teaching ? teen : bots(lv, binsFor(lv, 'teen'), 500, lcg(20260726));
    if (!raw.teaching && (teenF.G < tMin || teenF.G > BAND.teen.max || teenF.R < BAND.teen.randMin)) { why.band++; continue; }
    const kids = bots(lv, binsFor(lv, 'kids'), 400, lcg(1));
    const kinder = bots(lv, binsFor(lv, 'kinder'), 400, lcg(2));
    if (!raw.teaching && (kids.G > BAND.kids.max || kinder.G > BAND.kinder.max)) { why.ageBand++; continue; }
    if (!Object.values(AGE).every((a) => solvable(lv, binsFor(lv, a.id)))) { why.unsolvable++; continue; }

    return { lv, t, teen: teenF, kids, kinder };
  }
  return { fail: why };
}

// ── 主流程:逐關搜,成功的寫回 levels.js 的 ⟪PILES⟫ 區段 ──
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const levelsPath = join(root, 'levels.js');
let src = readFileSync(levelsPath, 'utf8');
const m = src.match(/export const PILES = ([\s\S]*?);\n\/\/ ⟪PILES-END⟫/);
let piles = {};
try { piles = m && m[1].trim() !== 'null' ? JSON.parse(m[1]) : {}; } catch { piles = {}; }

console.log('會幕拆卸 · 堆疊佈局產生器 v2(中央堆疊+多邊形遮擋)\n');
let bad = 0;
for (const raw of RAW) {
  if (ONLY && raw.id !== ONLY) continue;
  const hit = search(raw);
  if (hit.fail) {
    bad++;
    const w = hit.fail;
    console.log(`🔴 【${raw.name}】搜 ${TRIES} 次沒中——擺不下 ${w.layout} / 間距 ${w.spacing} / 青少年出帶 ${w.band} / 小檔出帶 ${w.ageBand} / 無解 ${w.unsolvable}`);
    continue;
  }
  const { lv, t, teen, kids, kinder } = hit;
  piles[raw.id] = {
    boards: Object.fromEntries(lv.boards.map((b) => [b.id, b.poly])),
    screws: Object.fromEntries(lv.screws.map((s) => [s.id, [s.x, s.y]])),
  };
  console.log(`🟢 【${raw.name}】第 ${t + 1} 個候選命中` +
    (raw.teaching ? '(教學關,不驗難度帶)'
      : ` 青少年 躺平 ${(teen.R * 100).toFixed(0)}%/會想 ${(teen.G * 100).toFixed(0)}% · 兒童 ${(kids.G * 100).toFixed(0)}% · 幼幼 ${(kinder.G * 100).toFixed(0)}%`));
}

if (!DRY && !bad) {
  src = src.replace(/export const PILES = [\s\S]*?;\n\/\/ ⟪PILES-END⟫/,
    `export const PILES = ${JSON.stringify(piles)};\n// ⟪PILES-END⟫`);
  writeFileSync(levelsPath, src, 'utf8');
  console.log('\n✓ 佈局已寫回 levels.js(⟪PILES⟫ 區段)。接著跑 npm run check 出廠檢驗。');
} else if (bad) {
  console.log('\n🔴 有關卡沒搜到,levels.js 沒有動。');
  process.exitCode = 1;
}
