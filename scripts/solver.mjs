#!/usr/bin/env node
// 會幕拆卸 —— 出廠檢驗員(solver + lint)
//
// 為什麼一定要有它:螺絲關的難度全靠人手擺,手擺極容易做出「根本解不開」的關,
// 孩子在課堂上會卡到哭。每設計完一關就跑一次,判定「保證可解」才准收進關卡表。
// (同 sports-balance-tester 的出廠檢驗思路:不看感覺,看窮舉。)
//
// 跑法:
//   node scripts/solver.mjs             # lint + 逐關求解,任何一關不可解就 exit 1
//   node scripts/solver.mjs --path      # 順便印出每關的一組通關順序
//   node scripts/solver.mjs --level veil
import { LEVELS, LAYOUT_ERRORS, COLORS, AGE, binsFor } from '../levels.js';
import { tightestSpacing, colorsOf, L } from '../layout.js';
import { pointInPoly } from '../rules.js';
import { BIN_SIZE, indexLevel, initState, exposedScrews, removeScrew, isWon, cloneState, stateKey } from '../rules.js';

const args = process.argv.slice(2);
const WANT_PATH = args.includes('--path');
const ONLY = args.includes('--level') ? args[args.indexOf('--level') + 1] : null;
const NODE_BUDGET = 800_000;

// ── lint:不用搜尋就能抓到的設計錯 ──
function lint(level) {
  const errs = [];
  const byColor = {};
  const ids = new Set();
  for (const s of level.screws) {
    if (ids.has(s.id)) errs.push(`螺絲 id 重複:${s.id}`);
    ids.add(s.id);
    byColor[s.color] = (byColor[s.color] || 0) + 1;
    if (!COLORS[s.color]) errs.push(`未知顏色:${s.color}(${s.id})`);
    const b = level.boards.find((x) => x.id === s.board);
    if (!b) { errs.push(`螺絲 ${s.id} 指向不存在的板 ${s.board}`); continue; }
    // 螺絲必須落在自己那片板的**真形狀**裡(v2 是多邊形),否則畫面上浮在半空、玩家點不到
    const onIt = b.poly ? pointInPoly(s.x, s.y, b.poly)
      : s.x >= b.x && s.x <= b.x + b.w && s.y >= b.y && s.y <= b.y + b.h;
    if (!onIt) errs.push(`螺絲 ${s.id} 不在板 ${b.id}(${b.label})的形狀內`);
  }
  // ★ 鐵則:每種顏色都要是 3 的倍數,否則一定有湊不滿的殘留 → 必卡死
  for (const [c, n] of Object.entries(byColor))
    if (n % BIN_SIZE !== 0) errs.push(`顏色 ${c} 共 ${n} 根,不是 ${BIN_SIZE} 的倍數(必有殘留湊不滿盒)`);
  const boardIds = new Set();
  for (const b of level.boards) {
    if (boardIds.has(b.id)) errs.push(`板 id 重複:${b.id}`);
    boardIds.add(b.id);
    if (!level.screws.some((s) => s.board === b.id))
      errs.push(`板 ${b.id}(${b.label})沒有任何螺絲,永遠拆不掉`);
  }
  if (!level.ref || !level.verse) errs.push('缺經文出處或經文(本系列鐵則:每關都要有和合本經文)');
  // ★ a11y:螺絲是固定 44px,手機上舞台約 350px → 中心間距低於 MIN_SPACING% 兩根就疊在一起
  const sp = tightestSpacing(level);
  if (sp.spacing < L.MIN_SPACING)
    errs.push(`最近的兩根螺絲(${sp.pair[0].id} / ${sp.pair[1].id})只距 ${sp.spacing}%,低於 ${L.MIN_SPACING}%` +
              `(手機上會疊在一起、孩子點不準)—— 這一柱太深或螺絲太多,改 columns`);
  return { errs, byColor };
}

// ── solver:DFS + 記憶化,窮舉「先拔哪一根」的所有順序 ──
function solve(level, bins) {
  const idx = indexLevel(level);
  const seen = new Set();
  let nodes = 0, budgetHit = false;

  function dfs(state, path) {
    if (isWon(state)) return path;
    if (++nodes > NODE_BUDGET) { budgetHit = true; return null; }
    const key = stateKey(level, state);
    if (seen.has(key)) return null;
    seen.add(key);
    for (const id of exposedScrews(idx, state)) {
      const next = cloneState(state);
      const r = removeScrew(idx, next, id);
      if (!r.ok) continue;           // 擔子爆了=這條路死,換一根試
      const got = dfs(next, [...path, id]);
      if (got) return got;
    }
    return null;
  }

  const path = dfs(initState(level, bins), []);
  return { path, nodes, budgetHit };
}

// ── 難度量測:可解 ≠ 好玩 ──
// solver 只證明「存在一條解」。若隨便亂拆都不會卡,這關就是零挑戰(孩子會覺得無聊)。
// 反過來卡死率太高則勸退。用「隨機亂拆」當躺平 bot,量它的卡死率,對照建議區間。
// 兩種 bot:
//   躺平 bot(random)= 完全不看顏色亂拆 → 這關「不動腦的下場」
//   會想 bot(greedy)= 只做一件事:能放進已開的同色擔子就優先拿,不隨便開新擔子
//                    → 逼近「一個會想一下的孩子」
// ★ 只看 random 會系統性高估難度(第一版就是這樣把 55% 誤判成「太緊」)。
//   真正的出廠標準是:會想 bot 幾乎一定過(不勸退),而躺平 bot 會吃到苦頭(有挑戰)。
function playout(level, idx, pickFn, bins) {
  const st = initState(level, bins);
  for (;;) {
    if (isWon(st)) return true;
    const ex = exposedScrews(idx, st);
    if (!ex.length) return false;
    const res = removeScrew(idx, st, pickFn(ex, st, idx));
    if (!res.ok) return false;
  }
}

function difficulty(level, bins, runs = 400) {
  const idx = indexLevel(level);
  let seed = 20260725; // 固定種子:每次跑同一組數字,才能當迴歸基準
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  let randomStuck = 0;
  for (let r = 0; r < runs; r++)
    if (!playout(level, idx, (ex) => ex[Math.floor(rnd() * ex.length) % ex.length], bins)) randomStuck++;

  let greedyStuck = 0;
  for (let r = 0; r < runs; r++) {
    const ok = playout(level, idx, (ex, st) => {
      const open = ex.filter((id) => st.bins.some((b) => b && b.color === idx.screw.get(id).color));
      const pool = open.length ? open : ex;
      return pool[Math.floor(rnd() * pool.length) % pool.length];
    }, bins);
    if (!ok) greedyStuck++;
  }
  return { random: randomStuck / runs, greedy: greedyStuck / runs };
}

// ★ 出廠標準(2026-07-25 加難度那輪重訂,取代舊的「>25% 就算太兇」):
//   舊標準是在「會想 bot 全關 0% 卡死」的世界寫的,會把我們刻意瞄準的 20~30% 判成紅燈。
//   量測後的分齡目標帶(scripts/tune-columns.mjs 用同一組數字挑關卡):
//     青少年:會想 12~40% 卡死(想一下也可能失手)、而且躺平要 ≥25%(不動腦要有代價)
//     兒童:會想 ≤25%(多一個擔子好轉身)   幼稚園:會想 ≤10%(幾乎不該卡)
//   教學關(level.teaching)例外:它的任務是教規則,0% 卡死是對的。
// 0726 使用者玩過堆疊第一版後點名「還要再加難度」→ 帶整段上移(gen-pile.mjs 同步)
const BAND = {
  teen:   { max: 0.55, min: 0.30, randMin: 0.5, why: '青少年' },
  kids:   { max: 0.30, min: 0,    randMin: 0,   why: '兒童' },
  kinder: { max: 0.10, min: 0,    randMin: 0,   why: '幼稚園' },
};
function difficultyVerdict(ageId, { random, greedy }, teaching, teenMin) {
  const R = (random * 100).toFixed(0) + '%', G = (greedy * 100).toFixed(0) + '%';
  const line = `躺平 bot 卡死 ${R} / 會想 bot 卡死 ${G}`;
  const b = BAND[ageId] || BAND.kids;
  const min = ageId === 'teen' && teenMin != null ? teenMin : b.min;   // 關卡可帶自己的下限(第五站全細長件)
  if (teaching) return { ok: true, line: `⚪ ${line} —— 教學關(專心教規則,不該卡死)` };
  if (greedy > b.max)
    return { ok: false, line: `🔴 ${line} —— ${b.why}檔會想也常卡(上限 ${b.max * 100}%),加一個擔子或改 columns` };
  if (greedy < min)
    return { ok: false, line: `🟠 ${line} —— ${b.why}檔太簡單(想一下必勝,下限 ${min * 100}%),減一個擔子或把柱疊深` };
  if (random < b.randMin)
    return { ok: false, line: `🟠 ${line} —— 連亂拆都很少卡(躺平應 ≥${b.randMin * 100}%),這關沒在考驗次序` };
  return { ok: true, line: `🟢 ${line} —— 落在${b.why}檔目標帶` };
}

let bad = 0;
// ★ 排不下版面的關卡根本進不了 LEVELS(見 levels.js),不在這裡擋就會「少一關卻全綠」
for (const e of LAYOUT_ERRORS) { bad++; console.log(`🔴 版面排不下:${e}`); }
const levels = ONLY ? LEVELS.filter((l) => l.id === ONLY) : LEVELS;
if (!levels.length) { console.log(`找不到關卡 ${ONLY}`); process.exit(1); }

console.log('會幕拆卸 · 出廠檢驗\n');
for (const level of levels) {
  const { errs, byColor } = lint(level);
  const counts = Object.entries(byColor).map(([c, n]) => `${COLORS[c]?.name || c}×${n}`).join(' / ');
  console.log(`【${level.name}】${level.ref}  螺絲 ${level.screws.length} 根(${counts})  擔子 ${level.bins} 個`);

  if (errs.length) { bad++; errs.forEach((e) => console.log(`   🔴 lint:${e}`)); continue; }
  console.log('   🟢 lint 通過(顏色都是 3 的倍數、螺絲都在板上、經文齊)');

  // ★ 三個年齡檔各驗一次:孩子選哪一檔都不能卡死(擔子數不同=完全不同的局)
  for (const age of Object.values(AGE)) {
    const bins = binsFor(level, age.id);
    const { path, nodes, budgetHit } = solve(level, bins);
    const tag = `${age.emoji} ${age.label}(擔子 ${bins})`;
    if (path) {
      console.log(`   🟢 ${tag} 保證可解(${path.length} 步 / 搜 ${nodes.toLocaleString()} 狀態)`);
      if (WANT_PATH) console.log(`      順序:${path.join(' → ')}`);
      const v = difficultyVerdict(age.id, difficulty(level, bins), level.teaching, level.teenMin);
      console.log(`      難度:${v.line}`);
      if (!v.ok) bad++;                      // ★ 難度出帶也算出廠不合格(不只是印個字)
    } else if (budgetHit) {
      bad++;
      console.log(`   🟠 ${tag} 未知 —— 搜到上限 ${NODE_BUDGET.toLocaleString()} 仍無解,請簡化後重測`);
    } else {
      bad++;
      console.log(`   🔴 ${tag} 不可解 —— 窮舉 ${nodes.toLocaleString()} 狀態無解。不准收進關卡表!`);
    }
  }
  console.log('');
}

console.log(bad ? `\n🔴 出廠檢驗未通過:${bad} 關有問題` : `\n🟢 出廠檢驗通過:${levels.length} 關全部保證可解`);
process.exitCode = bad ? 1 : 0;
