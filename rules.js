// 會幕拆卸 —— 規則核心(遊戲與 solver 共用同一份)
//
// ★ 為什麼獨立成檔:如果 solver 自己抄一份規則,兩邊會走鐘——
//   solver 說「這關保證可解」,孩子卻在課堂上卡死。規則只准有一份。

export const BIN_SIZE = 3; // 滿三個同色就收走(=顏色總數必為 3 的倍數的由來)

/**
 * 一關的初始狀態(純資料,不含畫面)。
 * bins 可覆寫(年齡檔:幼稚園 +2、兒童 +1、青少年 +0),不傳就用關卡基準。
 */
export function initState(level, bins, tray) {
  const n = Number.isFinite(bins) ? bins : level.bins;
  return {
    screws: new Set(level.screws.map((s) => s.id)),
    boards: new Set(level.boards.map((b) => b.id)),
    bins: Array.from({ length: n }, () => null), // null | { color, count }
    // 托盤(2026-07-26 使用者拍板):放不進箱的器皿先擱著,分齡格數(幼3/童2/青1)。
    // 同類箱一有位子就自動歸箱;托盤自湊滿三件同類=直接抬走(防三件同色全進托盤的死局)。
    tray: { cap: Number.isFinite(tray) ? tray : 0, items: [] },
    lost: false,
  };
}

/**
 * 點是否在多邊形內(ray casting;poly = [[x,y],…] 依序繞一圈,%-座標)。
 * ★ 2026-07-26 改版:板件從矩形換成「不規則形狀 + 全部疊在中間」(使用者點名),
 *   遮擋判定也要照真形狀——不是只有外觀剪個樣子。規則只有這一份,solver 與遊戲同吃。
 */
export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** 建索引:給 solver 與遊戲共用,避免每次都線性搜尋 */
export function indexLevel(level) {
  const board = new Map(level.boards.map((b) => [b.id, b]));
  const screw = new Map(level.screws.map((s) => [s.id, s]));
  // 每根螺絲「可能被誰壓住」= 層數更高、且**真形狀**蓋住這個點的板子
  // (舊版是矩形;板子帶 poly 就用多邊形,沒有 poly 的舊資料退回矩形判定)
  const hit = (b, x, y) => (b.poly ? pointInPoly(x, y, b.poly)
    : x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  const covers = new Map();
  for (const s of level.screws) {
    const own = board.get(s.board);
    const list = level.boards.filter(
      (b) => b.id !== s.board && b.layer > own.layer && hit(b, s.x, s.y)
    ).map((b) => b.id);
    covers.set(s.id, list);
  }
  // 每片板子上有哪些螺絲
  const onBoard = new Map(level.boards.map((b) => [b.id, []]));
  for (const s of level.screws) onBoard.get(s.board)?.push(s.id);
  return { board, screw, covers, onBoard };
}

/** 這根螺絲現在拔得出來嗎?(上面沒有還沒拆掉的板子壓著) */
export function isExposed(idx, state, screwId) {
  if (!state.screws.has(screwId)) return false;
  for (const b of idx.covers.get(screwId)) if (state.boards.has(b)) return false;
  return true;
}

export function exposedScrews(idx, state) {
  const out = [];
  for (const id of state.screws) if (isExposed(idx, state, id)) out.push(id);
  return out;
}

/**
 * 把一根螺絲放進擔子(收納盒)。
 * 規則:先找「同色且還沒滿」的盒;沒有就找空盒;都沒有 → 卡住(輸)。
 * 放進去滿 BIN_SIZE 就整盒收走(清空)。
 * 回傳 true=成功,false=卡住。
 */
export function placeInBin(state, color) {
  let i = state.bins.findIndex((b) => b && b.color === color && b.count < BIN_SIZE);
  if (i < 0) i = state.bins.findIndex((b) => b === null);
  if (i < 0) return false;
  const bin = state.bins[i] || (state.bins[i] = { color, count: 0 });
  bin.count++;
  if (bin.count >= BIN_SIZE) state.bins[i] = null; // 收走
  return true;
}

/**
 * 拔一根螺絲(會就地改 state)。
 * 回傳 { ok, boardCleared } —— boardCleared 是這一拔讓哪片板子掉了(給動畫用)。
 */
export function removeScrew(idx, state, screwId) {
  if (!isExposed(idx, state, screwId)) return { ok: false };
  const s = idx.screw.get(screwId);
  // 抬走動畫用:記下每格拔之前裝的顏色,結尾 diff 出「這一拔被抬走的箱子」。
  // 箱子只會「同色加滿→清空」,不會原地換色,所以 非null→null 就是被抬走。
  const hadBin = state.bins.map((b) => (b ? b.color : null));
  let toTray = false;
  if (!placeInBin(state, s.color)) {
    if (state.tray && state.tray.items.length < state.tray.cap) { state.tray.items.push(s.color); toTray = true; }
    else return { ok: false, full: true };   // 拒絕這一下,不判死——真卡死由 isStuck 統一判
  }
  state.screws.delete(screwId);
  const rest = idx.onBoard.get(s.board).some((id) => state.screws.has(id));
  let boardCleared = null;
  if (!rest) { state.boards.delete(s.board); boardCleared = s.board; }
  flushTray(state);
  const clearedBins = [];
  state.bins.forEach((b, i) => { if (hadBin[i] && !b) clearedBins.push({ i, color: hadBin[i] }); });
  return { ok: true, boardCleared, toTray, clearedBins };
}

/**
 * 托盤歸箱:①同色箱有位子就自動放進去(不佔空箱=不替玩家做佔箱決定)
 * ②托盤自己湊滿三件同類=直接抬走(等於借空箱即滿即收,防死局)。
 */
export function flushTray(state) {
  if (!state.tray || !state.tray.items.length) return 0;
  let moved = 0, progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < state.tray.items.length; i++) {
      const color = state.tray.items[i];
      const bi = state.bins.findIndex((b) => b && b.color === color && b.count < BIN_SIZE);
      if (bi < 0) continue;
      state.bins[bi].count++;
      if (state.bins[bi].count >= BIN_SIZE) state.bins[bi] = null;
      state.tray.items.splice(i, 1);
      moved++; progress = true; break;
    }
    const cnt = {};
    for (const c of state.tray.items) cnt[c] = (cnt[c] || 0) + 1;
    for (const color of Object.keys(cnt)) {
      if (cnt[color] >= BIN_SIZE) {
        for (let k = 0; k < BIN_SIZE; k++) state.tray.items.splice(state.tray.items.indexOf(color), 1);
        moved += BIN_SIZE; progress = true;
      }
    }
  }
  return moved;
}

export const isWon = (state) => state.screws.size === 0;

/** 這個顏色現在放得進去嗎?(同色箱有位/有空箱/托盤有位) */
export function canPlace(state, color) {
  if (state.bins.some((b) => b && b.color === color && b.count < BIN_SIZE)) return true;
  if (state.bins.some((b) => b === null)) return true;
  return !!(state.tray && state.tray.items.length < state.tray.cap);
}

/** 卡住 = 還有螺絲、但一根都拔不出來(或擔子爆了) */
export function isStuck(idx, state) {
  if (state.lost) return true;
  if (isWon(state)) return false;
  const ex = exposedScrews(idx, state);
  if (ex.length === 0) return true;
  return !ex.some((id) => canPlace(state, idx.screw.get(id).color));
}

/** 深拷貝(solver 用;只有原始型別與小集合,手寫比 structuredClone 快) */
export function cloneState(state) {
  return {
    screws: new Set(state.screws),
    boards: new Set(state.boards),
    bins: state.bins.map((b) => (b ? { color: b.color, count: b.count } : null)),
    tray: state.tray ? { cap: state.tray.cap, items: state.tray.items.slice() } : { cap: 0, items: [] },
    lost: state.lost,
  };
}

/** 狀態指紋:剩哪些螺絲 + 擔子內容(擔子順序不影響玩法,排序後才是同一個狀態) */
export function stateKey(level, state) {
  let mask = 0n;
  level.screws.forEach((s, i) => { if (state.screws.has(s.id)) mask |= 1n << BigInt(i); });
  const bins = state.bins.map((b) => (b ? `${b.color}:${b.count}` : '-')).sort().join(',');
  const tray = state.tray ? state.tray.items.slice().sort().join(',') : '';
  return mask.toString(36) + '|' + bins + '|' + tray;
}
