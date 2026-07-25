// 會幕拆卸 —— 版面算式(遊戲、solver、產生器共用同一份)
//
// ★ 為什麼改成「算出來」而不是手擺座標(2026-07-25 晚 → 07-25 加難度那輪):
//   第一版每片板、每根螺絲的 x/y 都是手擺的。兩個後果:
//   ① 手擺極容易讓螺絲掉出板外(lint 一直在擋這個),
//   ② 更糟的是**手擺擺不出「真的遮擋」**——板子只輕輕相疊,於是一開局幾乎所有螺絲都露著,
//      貪心策略(挑已開擔子的同色)必勝 → 使用者實測「太簡單」,量測也證實會想 bot 卡死 0%。
//
// 量測結論(scripts/depth-map.mjs):這個機制的決策深度只來自兩件事——
//   ① 同時暴露的螺絲要少(=真的層層壓住) ② 顏色種類 = 擔子數 + 1
//   顏色 ≤ 擔子 → 永遠有空盒,0% 卡死(零挑戰);顏色 ≥ 擔子+3 → 90~100% 卡死(勸退)。
//
// 所以關卡資料只描述「疊柱規格」(哪幾片板疊成一柱、從上到下的次序=拆卸次序=經文),
// 幾何由本檔算:同一柱內每片板往下錯開一截,螺絲一律放在「被上面整柱蓋住」的區域。
//   → 遮擋深度由結構保證,不靠人擺得準。
//   → 露出的那一截在板子下緣,標籤(.tag,畫在板子右下角)剛好落在露出來的那條帶子上,
//     所以每一片板的名字(帳幕的板/幔子/海狗皮…)都看得見=經文教學不打折。
//
// 座標系:0~100 相對單位,原點左上(舞台是正方形 aspect-ratio 1/1)。
// layer 越大 = 越上層 = 越先拆;由「在柱子裡的位置」自動算出,不再手寫。

export const L = {
  PAD: 5,        // 左右留白
  TOP: 6,        // 上緣留白
  BOTTOM: 5,     // 下緣留白
  GAP: 3,        // 柱與柱的間隙
  MAX_SHIFT: 9,  // 每層往下錯開的上限(太大會吃掉可用高度)
  MIN_CORE: 22,  // 最底層那片「被蓋住的核心區」至少要留這麼高(放得下螺絲)
  INSET: 6,      // 螺絲離板「左右」邊緣的內縮(% of 寬;要 ≥ 螺絲半徑,不然會凸出板外)
  INSET_Y: 5,    // 上下內縮(% of 高)。舞台是直式的,同樣的 % 在垂直方向等於更多像素,
                 // 所以垂直可以縮得比水平小一點,換到多一列格點。
  MIN_SPACING: 15, // 螺絲中心間距下限(以「舞台寬度的 %」為單位):螺絲固定 44px,
                   // 手機上舞台寬約 350px → 44/350 ≈ 12.5%,取 15% 留餘裕。
                   // 低於這個值兩根就會疊在一起,孩子點不準(a11y 觸控鐵則)。
  TAG_ROOM: 9,   // 板子下緣要留給標籤的高度(% of 高)。螺絲半徑約 4.7%、標籤約 4.3%,
                 // 不留這條就會像 2026-07-25 實測那樣:最上層那片板的名字被橛子壓成碎字。
  STAGE_ASPECT: 3 / 4, // 舞台 寬:高(index.html 的 .stage aspect-ratio 要一致!)
                   // ★ 直式舞台不是美術偏好,是容量問題:正方形舞台在 15% 間距下
                   //   一柱只排得出 10 個格點,18 根螺絲的關卡根本放不下(2026-07-25 實測)。
};

/** 垂直方向的間距下限(% of 高):同樣的像素距離,在較高的舞台上佔的 % 較小 */
const minY = () => L.MIN_SPACING * L.STAGE_ASPECT;
/** 把 (dx% of 寬, dy% of 高) 換成「舞台寬度的 %」這個統一單位,才能跟 MIN_SPACING 比 */
const norm = (dx, dy) => Math.hypot(dx, dy / L.STAGE_ASPECT);

// ★ 螺絲位置用「整柱共用的格點」配,不是每片板各自撒(2026-07-25 加難度那輪的 bug):
//   各板自己撒的話,同一柱裡相鄰兩片板的螺絲會落在幾乎同一點——實測只差 6px,
//   兩顆 44px 的橛子疊在一起,孩子根本點不到下面那顆。
//   格點間距一律 ≥ MIN_SPACING,一格只給一根螺絲 → 結構上不可能重疊。
//   配法:**最深的板先挑**(它可用的格子最少),並從最下面的格子往上拿,把上面的留給淺板。

/** 一柱的錯開量:柱越深就錯得越小,保證最底層仍有 MIN_CORE 的核心區可放螺絲 */
export function shiftFor(depth) {
  if (depth <= 1) return 0;
  const usable = 100 - L.TOP - L.BOTTOM;
  return Math.min(L.MAX_SHIFT, (usable - L.MIN_CORE) / (2 * (depth - 1)));
}

/**
 * 把「疊柱規格」算成實際幾何。
 * 吃:{ columns: [[boardId, ...上→下], ...], boards: [{id,label}], screws: [{id,board,color}] }
 * 吐:同一份關卡,但 boards 補上 layer/x/y/w/h、screws 補上 x/y(其餘欄位原樣帶過)。
 */
export function layoutLevel(level) {
  const cols = level.columns;
  const K = cols.length;
  const colW = (100 - 2 * L.PAD - L.GAP * (K - 1)) / K;
  const usable = 100 - L.TOP - L.BOTTOM;

  const byId = new Map(level.boards.map((b) => [b.id, b]));
  const screwsOf = new Map(level.boards.map((b) => [b.id, []]));
  for (const s of level.screws) screwsOf.get(s.board)?.push(s);

  const boards = [], screws = [];
  cols.forEach((ids, k) => {
    const depth = ids.length;
    const shift = shiftFor(depth);
    const h = usable - shift * (depth - 1);
    const x = L.PAD + k * (colW + L.GAP);

    ids.forEach((id, d) => {
      const raw = byId.get(id);
      if (!raw) throw new Error(`columns 指到不存在的板:${id}`);
      const y = L.TOP + shift * d;
      boards.push({ ...raw, layer: depth - d, x: +x.toFixed(1), y: +y.toFixed(1),
                    w: +colW.toFixed(1), h: +h.toFixed(1) });
    });

    // ── 這一柱的格點 ──
    const span = shift * (depth - 1) + h;                 // 整柱從最上緣到最下緣
    const nx = Math.max(1, Math.floor((colW - 2 * L.INSET) / L.MIN_SPACING));
    const ny = Math.max(1, Math.floor((span - 2 * L.INSET_Y) / minY()));
    const pitchX = (colW - 2 * L.INSET) / nx, pitchY = (span - 2 * L.INSET_Y) / ny;
    const slots = [];
    for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++)
      slots.push({ x: x + L.INSET + pitchX * (c + 0.5), y: L.TOP + L.INSET_Y + pitchY * (r + 0.5), used: false });

    // 最深的板先配(可用格子最少),而且從最下面的格子往上拿
    const order = ids.map((id, d) => ({ id, d })).sort((a, b) => b.d - a.d);
    for (const { id, d } of order) {
      const list = screwsOf.get(id) || [];
      const top = L.TOP + shift * d;                      // 自己的上緣:螺絲要在自己板子上
      const buriedTo = L.TOP + h;                         // 最上面那片板的下緣:超過就沒被蓋住
      // 下界再扣掉 TAG_ROOM:最上層那片板的標籤就在 buriedTo 附近,螺絲不能壓上去
      const free = slots.filter((s) => !s.used && s.y >= top + 3 && s.y <= buriedTo - L.TAG_ROOM)
                        .sort((a, b) => b.y - a.y || a.x - b.x);
      if (free.length < list.length)
        throw new Error(`【${level.id}】第 ${k + 1} 柱的板 ${id} 放不下 ${list.length} 根螺絲` +
                        `(這一柱 ${depth} 層太深/螺絲太多,只剩 ${free.length} 個間距合格的位置)` +
                        ` —— 改 columns 分薄一點`);
      list.forEach((s, i) => {
        const slot = free[i];
        slot.used = true;
        screws.push({ ...s, x: +slot.x.toFixed(1), y: +slot.y.toFixed(1) });
      });
    }
  });

  return { ...level, boards, screws };
}

/** 這一關實際有幾種顏色(難度公式用:顏色 = 擔子 + 1 才落在目標帶) */
export const colorsOf = (level) => new Set(level.screws.map((s) => s.color)).size;

/**
 * 全關「最近的兩根螺絲」相距多少(%)——solver 的 lint 用來擋「手機上會疊在一起」。
 * ★ 一定要跨板比對:同一柱裡相鄰兩片板的螺絲最容易撞在一起(只比同一片板的話會漏,
 *   2026-07-25 就是這樣讓兩顆橛子只差 6px 上線前才被瀏覽器實測抓到)。
 */
export function tightestSpacing(level) {
  const s = level.screws;
  let min = Infinity, pair = null;
  for (let i = 0; i < s.length; i++)
    for (let j = i + 1; j < s.length; j++) {
      const d = norm(s[i].x - s[j].x, s[i].y - s[j].y);   // 換成統一單位再比
      if (d < min) { min = d; pair = [s[i], s[j]]; }
    }
  return { spacing: +min.toFixed(1), pair };
}
