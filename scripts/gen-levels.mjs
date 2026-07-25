#!/usr/bin/env node
// 關卡產生器 —— 用數據找「真的有難度」的佈局,不靠人猜。
//
// 由來(2026-07-25 使用者回報「太簡單」):量測發現**會想 bot 在任何擔子數下都是 0% 卡死**,
// 連 2 個擔子(亂拆 100% 死)都難不倒它 → 這個玩法原本的關卡沒有決策深度,
// 一條極簡策略(優先拿已開擔子的同色)就必勝。減擔子只懲罰亂拆的人,對會思考的孩子不變難。
//
// 深度從哪來:**同時暴露的螺絲要少、而且顏色要交錯**。
// 螺絲一次露出太多 → 永遠找得到「已開擔子的同色」→ 貪心必勝。
// 所以產生器往「深層遮擋 + 每片板螺絲少 + 顏色對抗排列」的方向隨機搜,再用兩隻 bot 篩。
//
// 跑法:node scripts/gen-levels.mjs [--n 4] [--screws 18] [--colors 5] [--bins 4] [--tries 4000]
// 只印候選關卡(可直接貼進 levels.js),不改任何檔。
import { LEVELS, COLORS } from '../levels.js';
import { BIN_SIZE, indexLevel, initState, exposedScrews, removeScrew, isWon, cloneState, stateKey } from '../rules.js';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? +process.argv[i + 1] : d; };
const WANT = arg('n', 4), SCREWS = arg('screws', 18), NCOL = arg('colors', 5), BINS = arg('bins', 4), TRIES = arg('tries', 4000);
const COLOR_IDS = Object.keys(COLORS).slice(0, NCOL);

// 目標帶:會想 bot 也要會卡(有深度),但不能太兇;躺平 bot 應該慘
const GREEDY_MIN = 0.12, GREEDY_MAX = 0.40, RANDOM_MIN = 0.60;

let seed = 987654321;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rnd() * a.length) % a.length];

/** 產一個候選佈局:深層堆疊,每層 1~3 片小板,每片 1~3 根螺絲 */
function makeLevel(i) {
  const nBoards = 6 + Math.floor(rnd() * 4);           // 6~9 片
  const boards = [];
  const rows = Math.ceil(nBoards / 2);
  for (let b = 0; b < nBoards; b++) {
    const row = Math.floor(b / 2), col = b % 2;
    const w = 34 + rnd() * 16, h = Math.max(16, 74 / rows - 2 + rnd() * 8);
    boards.push({
      id: 'b' + b,
      label: '',
      layer: nBoards - b,                               // 越前面越上層
      x: Math.min(52, 8 + col * 30 + rnd() * 10),
      y: Math.min(76, 8 + row * (72 / rows) + rnd() * 5),
      w, h,
    });
  }
  // 顏色池:每色 3 的倍數
  const per = Math.floor(SCREWS / BIN_SIZE / COLOR_IDS.length) * BIN_SIZE || BIN_SIZE;
  let pool = [];
  for (const c of COLOR_IDS) for (let k = 0; k < per; k++) pool.push(c);
  while (pool.length + BIN_SIZE <= SCREWS) { const c = pick(COLOR_IDS); for (let k = 0; k < BIN_SIZE; k++) pool.push(c); }
  // 洗牌
  for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }

  const screws = [];
  let n = 0;
  for (const b of boards) {
    const cnt = Math.min(pool.length - (boards.length - boards.indexOf(b) - 1), 1 + Math.floor(rnd() * 3));
    for (let k = 0; k < cnt && pool.length; k++) {
      screws.push({
        id: 's' + (++n), board: b.id,
        x: +(b.x + 6 + rnd() * Math.max(4, b.w - 12)).toFixed(1),
        y: +(b.y + 5 + rnd() * Math.max(4, b.h - 10)).toFixed(1),
        color: pool.pop(),
      });
    }
  }
  // 剩下的塞回最底層那片
  const last = boards[boards.length - 1];
  while (pool.length) {
    screws.push({ id: 's' + (++n), board: last.id,
      x: +(last.x + 6 + rnd() * Math.max(4, last.w - 12)).toFixed(1),
      y: +(last.y + 5 + rnd() * Math.max(4, last.h - 10)).toFixed(1),
      color: pool.pop() });
  }
  // 沒螺絲的板子要剔掉(永遠拆不掉)
  const used = new Set(screws.map((s) => s.board));
  return { id: 'gen' + i, name: 'gen' + i, ref: '—', verse: '—', hint: '—', bins: BINS,
           boards: boards.filter((b) => used.has(b.id)), screws };
}

function solvable(level, bins) {
  const idx = indexLevel(level); const seen = new Set(); let n = 0;
  const dfs = (st) => {
    if (isWon(st)) return true;
    if (++n > 300000) return false;
    const k = stateKey(level, st); if (seen.has(k)) return false; seen.add(k);
    for (const id of exposedScrews(idx, st)) {
      const nx = cloneState(st); if (!removeScrew(idx, nx, id).ok) continue;
      if (dfs(nx)) return true;
    }
    return false;
  };
  return dfs(initState(level, bins));
}

function bots(level, bins, runs = 300) {
  const idx = indexLevel(level);
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

const hits = [];
let tried = 0;
for (let i = 0; i < TRIES && hits.length < WANT; i++) {
  tried++;
  const lv = makeLevel(i);
  if (lv.screws.length !== SCREWS) continue;
  const b = bots(lv, BINS, 120);
  if (b.G < GREEDY_MIN || b.G > GREEDY_MAX || b.R < RANDOM_MIN) continue;   // 先用少量場次粗篩
  if (!solvable(lv, BINS)) continue;                                        // 再確認保證可解(貴)
  const fine = bots(lv, BINS, 500);
  if (fine.G < GREEDY_MIN || fine.G > GREEDY_MAX) continue;
  hits.push({ lv, ...fine });
  console.log(`  ✓ 候選 ${hits.length}:躺平 ${(fine.R * 100).toFixed(0)}% / 會想 ${(fine.G * 100).toFixed(0)}% 卡死 ` +
              `(${lv.boards.length} 片板 / ${lv.screws.length} 根 / ${BINS} 擔子)`);
}

console.log(`\n試了 ${tried} 個佈局,找到 ${hits.length} 個落在目標帶(會想 bot 卡死 ${GREEDY_MIN * 100}~${GREEDY_MAX * 100}%)`);
if (!hits.length) {
  console.log('沒找到 → 這組參數(螺絲/顏色/擔子)可能天生沒有深度,調 --colors 多一點或 --bins 少一點再試。');
  process.exitCode = 1;
} else {
  console.log('\n貼進 levels.js(記得補 name/ref/verse/hint,經文要 cuv 查證):\n');
  console.log(JSON.stringify(hits.map((h) => ({ boards: h.lv.boards, screws: h.lv.screws })), null, 1).slice(0, 6000));
}
