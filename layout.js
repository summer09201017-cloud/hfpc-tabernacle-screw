// 會幕拆卸 —— 版面引擎 v2「中央堆疊」(遊戲、solver、產生器共用同一份)
//
// ★ 2026-07-26 使用者拍板重做:
//   「所有板件都要一起重疊在中間,不要分欄;海狗皮/公羊皮/幔子要不規則形狀,
//    而且**遮擋判定也要照真形狀**,不是矩形剪個外觀。」
//   → v1 的「疊柱」引擎(直欄矩形)整個換掉:每片板是一個不規則多邊形,
//     全部堆在舞台中央,誰壓住誰由 rules.js 的 pointInPoly 用真形狀判。
//
// ★ 難度不靠猜:佈局由 scripts/gen-pile.mjs 隨機搜尋 + 兩隻 bot 量測,
//   落在分齡目標帶(青少年 12~40% 卡死、幼幼 ≤10%)才收進 levels.js。
//   本檔只負責「形狀怎麼生、幾何怎麼算」,不決定難度。
//
// 座標系:x = 舞台寬的 %(0~100),y = 舞台高的 %(0~100);舞台是 3:4 直式。
// 旋轉在「實體空間」做完再換回 %-座標(不然直式舞台會把角度拉歪)。

export const L = {
  MIN_SPACING: 15,     // 螺絲中心間距下限(以「舞台寬的 %」為單位):44px / 350px 寬 ≈ 12.5%,取 15 留餘裕
  STAGE_ASPECT: 3 / 4, // 舞台 寬:高(index.html 的 .stage aspect-ratio 要一致!)
  EDGE: 4,             // 板件離舞台邊緣至少這麼多(%)
  SCREW_INSET: 4.5,    // 螺絲離板緣的內縮(%):橛子的圓要大致坐在板上
};

/** (dx% of 寬, dy% of 高) → 統一成「寬的 %」再算距離(直式舞台的等效像素距離) */
export const norm = (dx, dy) => Math.hypot(dx, dy / L.STAGE_ASPECT);

// ── 形狀模板:單位形狀(中心在原點、半徑 ~1),頂點帶「材料味」的抖動 ──
// 抖動由傳入的 rnd 決定 → 同一顆種子永遠生出同一片皮(佈局存進 levels.js 後就固定)。
function blob(rnd, n, rough) {          // 獸皮:繞一圈的隆起
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 1 - rough / 2 + rnd() * rough;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}
function drape(rnd) {                   // 幔子/毯子:上緣平、下緣垂波浪
  const pts = [[-1, -1], [1, -1]];
  const waves = 5 + Math.floor(rnd() * 3);
  for (let i = 0; i <= waves * 2; i++) {
    const x = 1 - (2 * i) / (waves * 2);
    pts.push([x, i % 2 === 0 ? 1 : 0.8 + rnd() * 0.1]);
  }
  return pts.map(([x, y]) => [x * (0.94 + rnd() * 0.06), y]);
}
function plank(rnd) {                   // 板/座:四角微抖的方片
  const j = () => (rnd() - 0.5) * 0.16;
  return [[-1 + j(), -1 + j()], [1 + j(), -1 + j()], [1 + j(), 1 + j()], [-1 + j(), 1 + j()]];
}
const TEMPLATE = {
  seal: (r) => blob(r, 14, 0.5), ram: (r) => blob(r, 12, 0.42), goat: (r) => drape(r),
  veil: (r) => drape(r), linen: (r) => drape(r), bluecloth: (r) => drape(r),
  wood: (r) => plank(r), gilt: (r) => plank(r), gold: (r) => plank(r),
  silver: (r) => plank(r), bronze: (r) => plank(r), rope: (r) => plank(r),
};

/** 半徑(x-單位 %):shape 決定長什麼比例 */
const SIZE = {
  plate:  { rx: [24, 32], ry: [17, 23] },
  pillar: { rx: [6, 8],   ry: [24, 32] },
  bar:    { rx: [30, 40], ry: [6, 9] },    // 0726 加大:橫件要蓋得住柱上的卯,第五站才埋得深
  base:   { rx: [17, 24], ry: [9, 13] },
  rope:   { rx: [34, 42], ry: [3.5, 5] },
};

/**
 * 生一片板的多邊形:模板 → 縮放 → 旋轉(實體空間)→ 平移 → 換回 %-座標。
 * 全數用 rnd(種子隨機)→ 產生器搜出來的佈局是可重現的。
 */
export function makePoly(mat, shape, cx, cy, rnd, rot) {
  const t = (TEMPLATE[mat] || plank)(rnd);
  const sz = SIZE[shape] || SIZE.plate;
  const rx = sz.rx[0] + rnd() * (sz.rx[1] - sz.rx[0]);
  const ry = sz.ry[0] + rnd() * (sz.ry[1] - sz.ry[0]);
  const cos = Math.cos(rot), sin = Math.sin(rot);
  return t.map(([ux, uy]) => {
    const px = ux * rx, py = uy * ry / L.STAGE_ASPECT;      // 進實體空間(等效 x-單位)
    const qx = px * cos - py * sin, qy = px * sin + py * cos; // 旋轉
    return [+(cx + qx).toFixed(1), +(cy + qy * L.STAGE_ASPECT).toFixed(1)]; // 回 %-座標
  });
}

export const bboxOf = (poly) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

export const centroidOf = (poly) => {
  let sx = 0, sy = 0;
  for (const [x, y] of poly) { sx += x; sy += y; }
  return [sx / poly.length, sy / poly.length];
};

/** 全關最近的兩根螺絲相距多少(統一單位)——lint 用來擋「手機上疊在一起」 */
export function tightestSpacing(level) {
  const s = level.screws;
  let min = Infinity, pair = null;
  for (let i = 0; i < s.length; i++)
    for (let j = i + 1; j < s.length; j++) {
      const d = norm(s[i].x - s[j].x, s[i].y - s[j].y);
      if (d < min) { min = d; pair = [s[i], s[j]]; }
    }
  return { spacing: +min.toFixed(1), pair };
}

/** 這一關實際有幾種顏色(難度公式用:顏色 = 擔子 + 1 才有決策深度) */
export const colorsOf = (level) => new Set(level.screws.map((s) => s.color)).size;

/**
 * 把 levels.js 存的「堆疊佈局」補上渲染需要的幾何(bbox / 標籤錨點)。
 * 佈局本身(poly / 螺絲座標)是 gen-pile.mjs 搜出來、量測過難度才存檔的,這裡不再動它。
 */
export function layoutLevel(level) {
  const boards = level.boards.map((b) => {
    const bbox = bboxOf(b.poly);
    return { ...b, bbox, anchor: centroidOf(b.poly) };
  });
  return { ...level, boards };
}
