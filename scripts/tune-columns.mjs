#!/usr/bin/env node
// 會幕拆卸 —— 疊柱調校器(難度的唯一旋鈕:哪幾片板疊成一柱)
//
// 由來:使用者實測「太簡單」。量測(scripts/depth-map.mjs)證實決策深度只來自兩件事:
//   ① 同時暴露的螺絲要少(=真的層層壓住) ② 顏色種類 = 擔子數 + 1
// 顏色與擔子已經對了(每關 bins = 顏色−1),缺的是遮擋 → 難度全在「怎麼疊柱」。
//
// 本工具窮舉「把這一關的板子分配到 1~3 柱(柱內保持原本的上下次序)」的所有分法,
// 用兩隻 bot 量每一種分法的卡死率,只印出落在目標帶的候選,並附「每柱裝了哪幾片板(名字)」,
// 讓人照經文次序挑(例:法櫃一定要壓在幔子底下——民 4:5-6、4:15)。
//
// 跑法:node scripts/tune-columns.mjs [--level veil] [--k 3] [--top 6]
// 只印候選,不改任何檔。
// 吃 RAW(還沒排版的規格),不吃 LEVELS —— 這樣「目前排不下的關卡」也還能拿來重新搜
import { RAW, AGE, binsFor } from '../levels.js';
import { layoutLevel, colorsOf, tightestSpacing, L } from '../layout.js';
import { indexLevel, initState, exposedScrews, removeScrew, isWon, cloneState, stateKey } from '../rules.js';

const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const ONLY = argv('level', null);
const MAXK = +argv('k', 4);
const TOP = +argv('top', 3);
// 擔子數也是旋鈕(關卡 bins 欄位=青少年基準):不指定就一起搜 2~5,看哪個配得上這關的顏色數
const BINS = argv('bins', null) ? [+argv('bins')] : [2, 3, 4, 5];

// ★ 神學次序當硬約束(不是事後人工挑):--under f:a 表示「板 f 必須在同一柱、且在 a 的下方」
//   例:法櫃(f)一定要壓在遮掩櫃的幔子(a)底下 —— 不摘幔子就不能碰聖物(民 4:5、4:15)。
//   多條用逗號分隔;上方可接受多選一用 |(例 e:b|c|d = 下閂要壓在任一片板底下)。
const UNDER = (argv('under', '') || '').split(',').filter(Boolean)
  .map((s) => { const [lo, hi] = s.split(':'); return { lo, his: (hi || '').split('|') }; });

// 目標帶:青少年檔要「想一下也可能卡」,幼稚園檔要「幾乎不會卡」(分齡鐵則)
const TEEN_MIN = 0.12, TEEN_MAX = 0.40, KINDER_MAX = 0.05;

let seed = 20260725;                                  // 固定種子=可當迴歸基準
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rnd() * a.length) % a.length];

function bots(level, bins, runs) {
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

function solvable(level, bins, budget = 400000) {
  const idx = indexLevel(level); const seen = new Set(); let n = 0;
  const dfs = (st) => {
    if (isWon(st)) return true;
    if (++n > budget) return false;
    const k = stateKey(level, st); if (seen.has(k)) return false; seen.add(k);
    for (const id of exposedScrews(idx, st)) {
      const nx = cloneState(st); if (!removeScrew(idx, nx, id).ok) continue;
      if (dfs(nx)) return true;
    }
    return false;
  };
  return dfs(initState(level, bins));
}

/** 這一關的板子「從上到下」的正規次序(新格式看 columns,舊格式看 layer) */
function orderOf(level) {
  if (level.columns) return level.columns.flat().map((id) => level.boards.find((b) => b.id === id));
  return [...level.boards].sort((a, b) => b.layer - a.layer);
}

/** 所有把 D 片板分到 ≤K 柱的分法(限制成長字串:去掉「柱子互換」的重複) */
function* partitions(D, K) {
  const a = new Array(D).fill(0);
  const rec = function* (i, used) {
    if (i === D) { yield a.slice(); return; }
    for (let c = 0; c <= Math.min(used, K - 1); c++) {
      a[i] = c;
      yield* rec(i + 1, Math.max(used, c + 1));
    }
  };
  yield* rec(0, 0);
}

console.log('會幕拆卸 · 疊柱調校器');
console.log(`目標帶:青少年檔 會想 bot 卡死 ${TEEN_MIN * 100}~${TEEN_MAX * 100}% 且 幼稚園檔 ≤ ${KINDER_MAX * 100}%\n`);

const levels = ONLY ? RAW.filter((l) => l.id === ONLY) : RAW;
for (const level of levels) {
  const order = orderOf(level);
  const D = order.length;
  const ncol = colorsOf(level);
  console.log(`【${level.name}】${level.screws.length} 根螺絲 / ${ncol} 色 / 擔子 ${level.bins}(青少年基準)` +
              `  ${ncol === level.bins + 1 ? '🟢 顏色=擔子+1' : `🟠 顏色≠擔子+1(建議 bins=${ncol - 1})`}`);

  const hits = [];
  let tried = 0;
  for (const asg of partitions(D, MAXK)) for (const bins of BINS) {
    const K = Math.max(...asg) + 1;
    const cols = Array.from({ length: K }, () => []);
    asg.forEach((c, i) => cols[c].push(order[i].id));
    tried++;
    // 神學次序不合就直接不算候選(免得人工從幾十個候選裡挑到違反經文的)
    if (!UNDER.every(({ lo, his }) => {
      const col = cols.find((c) => c.includes(lo));
      const iLo = col.indexOf(lo);
      return his.some((h) => { const i = col.indexOf(h); return i >= 0 && i < iLo; });
    })) continue;

    let cand;
    try {
      cand = layoutLevel({ ...level,
        bins,
        columns: cols,
        boards: level.boards.map(({ id, label }) => ({ id, label })),
        screws: level.screws.map(({ id, board, color }) => ({ id, board, color })) });
    } catch { continue; }        // 這一柱放不下(格點不夠)= 這個分法不可行

    // 硬篩:柱子一深、能用的格點就變少,螺絲會擠到重疊(手機上點不準)
    if (tightestSpacing(cand).spacing < L.MIN_SPACING) continue;

    const teenBins = binsFor(cand, 'teen');
    const rough = bots(cand, teenBins, 120);                       // 粗篩(便宜)
    if (rough.G < TEEN_MIN - 0.04 || rough.G > TEEN_MAX + 0.04) continue;

    const teen = bots(cand, teenBins, 500);
    if (teen.G < TEEN_MIN || teen.G > TEEN_MAX) continue;
    const kinder = bots(cand, binsFor(cand, 'kinder'), 400);
    if (kinder.G > KINDER_MAX) continue;
    const kids = bots(cand, binsFor(cand, 'kids'), 400);
    if (!Object.values(AGE).every((a) => solvable(cand, binsFor(cand, a.id)))) continue;

    hits.push({ cols, bins, teen, kids, kinder,
                score: Math.abs(teen.G - (TEEN_MIN + TEEN_MAX) / 2) });
  }

  hits.sort((a, b) => a.score - b.score);
  console.log(`  試 ${tried} 種(分法 × 擔子數),${hits.length} 種落在目標帶` + (hits.length ? ':' : ' —— 顏色數可能不夠,要加一種材料'));
  // 每個 bins 值只留最好的幾個,免得同一個擔子數塞滿版面
  const perBins = new Map();
  const shown = hits.filter((h) => { const n = perBins.get(h.bins) || 0; perBins.set(h.bins, n + 1); return n < TOP; });
  for (const h of shown.slice(0, TOP * 2)) {
    console.log(`   · 擔子 ${h.bins} → 青少年 躺平 ${(h.teen.R * 100).toFixed(0)}% / 會想 ${(h.teen.G * 100).toFixed(0)}%` +
                ` · 兒童 會想 ${(h.kids.G * 100).toFixed(0)}% · 幼稚園 會想 ${(h.kinder.G * 100).toFixed(0)}%`);
    h.cols.forEach((ids, k) => console.log(`       柱${k + 1}(上→下):` +
      ids.map((id) => level.boards.find((b) => b.id === id).label || id).join(' → ')));
  }
  console.log('');
}
