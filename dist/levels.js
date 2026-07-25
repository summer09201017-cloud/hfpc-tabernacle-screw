// 會幕拆卸 —— 關卡資料(民數記 4:5-6, 15, 25-26, 31-32;民 1:51)
//
// 機制對應經文:
//   螺絲=橛子/卯(民 4:32「橛子、繩子」);板件=帳幕的板、閂、幔子、蓋、帷子
//   收納盒=三族的擔子:哥轄(金,聖物,肩頭抬,民 7:9)/ 革順(藍,幔子帷子,民 4:25-26)
//                      / 米拉利(棕,板閂柱座,民 4:31-32)
//   上層壓著下層才不能拆 = 民 4:5-6「先摘下幔子蒙蓋法櫃」的拆卸順序
//
// ★ 鐵則(scripts/solver.mjs 會逐關檢查,違反就不准收進來):
//   1. 每種顏色的螺絲總數必須是 3 的倍數(否則一定湊不滿盒、必有殘留)
//   2. 每一關都要 solver 判定「保證可解」
//   3. 每根螺絲要落在自己那片板子的範圍內
//
// 座標系:0~100 的相對單位(渲染時再乘上實際畫布大小),原點左上。
// layer 越大 = 越上層 = 越先拆。

// 顏色即經文:藍色、紫色、朱紅色是幔子的三色(出 26:1「用撚的細麻和藍色、紫色、朱紅色線製造」),
// 木色=米拉利扛的板閂柱座,金色=哥轄扛的聖所器具。
// ★ 難度來源:顏色種類要「多於擔子數」,否則永遠有空盒可放=不可能卡死=零挑戰
//   (第一版三色配三擔子,solver 量到 0% 卡死率,等於沒有解謎)。
export const COLORS = {
  wood: { name: '板、閂、柱子、帶卯的座', hex: '#8d6e42', dark: '#5d4527', tribe: '米拉利' },
  blue: { name: '藍色線的幔子', hex: '#2f6fb5', dark: '#1d4676', tribe: '革順' },
  purple: { name: '紫色線的幔子', hex: '#7b4397', dark: '#4e2760', tribe: '革順' },
  scarlet: { name: '朱紅色線的幔子', hex: '#b83227', dark: '#7a1f18', tribe: '革順' },
  gold: { name: '聖所的器具', hex: '#c9a227', dark: '#8a6d13', tribe: '哥轄' },
};

// 年齡三檔(kid-age-modes 慣例;跨關共用偏好鍵 hfpc-age-pref)。
// 這款是純邏輯解謎,沒有手速/命中區可調——**唯一有意義的難度旋鈕是「擔子數」**:
// 擔子越多 → 越不會被「盒子塞滿不同顏色」卡死。各關 bins 欄位=青少年基準。
// ★ 每一檔都要過 solver:`npm run check` 會逐檔驗「保證可解」並量兩隻 bot 的卡死率。
export const AGE = {
  kinder: { id: 'kinder', label: '幼稚園', emoji: '🧸', bonusBins: 2, speakHowto: true,
            sub: '不識字也能玩・擔子最多、幾乎不會卡・自動唸玩法' },
  kids:   { id: 'kids',   label: '兒童',   emoji: '🙂', bonusBins: 1, speakHowto: false,
            sub: '一般玩法(7–12 歲)・多一個擔子好轉身' },
  teen:   { id: 'teen',   label: '青少年', emoji: '🧑', bonusBins: 0, speakHowto: false,
            sub: '挑戰・擔子最少,拆錯順序就卡住' },
};
export const AGE_PREF_KEY = 'hfpc-age-pref'; // 全系列共用:選一次,別關也記得
export function getAge(id) { return AGE[id] || AGE.kids; }
/** 這一關在這個年齡檔實際有幾個擔子 */
export function binsFor(level, ageId) {
  return Math.min(6, level.bins + getAge(ageId).bonusBins);
}

// 板件形狀只有 rect(矩形)——會幕的板本來就是長方形(出 26:16),不需要多餘形狀
export const LEVELS = [
  {
    id: 'court',
    name: '第一站 · 院子的帷子',
    ref: '民數記 4:32',
    verse: '院子四圍的柱子和其上帶卯的座、橛子、繩子,並一切使用的器具。',
    hint: '先拆上面壓著的那片,下面的橛子才拔得出來。',
    bins: 3,
    boards: [
      { id: 'a', label: '帷子', layer: 2, x: 14, y: 12, w: 44, h: 30 },
      { id: 'b', label: '柱子', layer: 1, x: 30, y: 34, w: 44, h: 30 },
      { id: 'c', label: '帶卯的座', layer: 0, x: 20, y: 58, w: 50, h: 28 },
    ],
    screws: [
      { id: 's1', board: 'a', x: 22, y: 20, color: 'blue' },
      { id: 's2', board: 'a', x: 50, y: 20, color: 'blue' },
      { id: 's3', board: 'a', x: 22, y: 36, color: 'blue' },
      { id: 's4', board: 'b', x: 66, y: 42, color: 'wood' },
      { id: 's5', board: 'b', x: 66, y: 56, color: 'wood' },
      { id: 's6', board: 'c', x: 28, y: 78, color: 'wood' },
    ],
  },
  {
    id: 'gate',
    name: '第二站 · 會幕的門簾',
    ref: '民數記 4:25',
    verse: '他們要抬帳幕的幔子和會幕,並會幕的蓋與其上的海狗皮,和會幕的門簾。',
    hint: '兩片壓在同一根橛子上時,兩片都拆掉它才會露出來。',
    bins: 3,
    boards: [
      { id: 'a', label: '門簾', layer: 3, x: 30, y: 8, w: 40, h: 26 },
      { id: 'b', label: '海狗皮', layer: 2, x: 12, y: 26, w: 40, h: 26 },
      { id: 'c', label: '會幕的蓋', layer: 1, x: 48, y: 26, w: 40, h: 26 },
      { id: 'd', label: '幔子', layer: 0, x: 24, y: 48, w: 52, h: 34 },
    ],
    screws: [
      { id: 's1', board: 'a', x: 38, y: 16, color: 'blue' },
      { id: 's2', board: 'a', x: 62, y: 16, color: 'purple' },
      { id: 's3', board: 'b', x: 18, y: 34, color: 'wood' },
      { id: 's4', board: 'b', x: 18, y: 46, color: 'wood' },
      { id: 's5', board: 'b', x: 44, y: 34, color: 'blue' },
      { id: 's6', board: 'c', x: 82, y: 34, color: 'wood' },
      { id: 's7', board: 'c', x: 82, y: 46, color: 'purple' },
      { id: 's8', board: 'd', x: 32, y: 72, color: 'blue' },
      { id: 's9', board: 'd', x: 68, y: 72, color: 'purple' },
    ],
  },
  {
    id: 'covering',
    name: '第三站 · 帳幕的蓋',
    ref: '民數記 4:25',
    verse: '並會幕的蓋與其上的海狗皮。',
    hint: '收納盒滿三個同色就會收走,別讓三個盒子塞滿不同顏色。',
    bins: 3,
    boards: [
      { id: 'a', label: '海狗皮', layer: 3, x: 22, y: 8, w: 34, h: 24 },
      { id: 'b', label: '公羊皮', layer: 3, x: 56, y: 8, w: 30, h: 24 },
      { id: 'c', label: '山羊毛幔子', layer: 2, x: 14, y: 28, w: 46, h: 24 },
      { id: 'd', label: '繡花幔子', layer: 1, x: 44, y: 28, w: 42, h: 30 },
      { id: 'e', label: '帳幕的板', layer: 0, x: 20, y: 54, w: 56, h: 30 },
    ],
    screws: [
      { id: 's1', board: 'a', x: 28, y: 14, color: 'wood' },
      { id: 's2', board: 'a', x: 48, y: 14, color: 'blue' },
      { id: 's3', board: 'a', x: 28, y: 26, color: 'purple' },
      { id: 's4', board: 'b', x: 62, y: 14, color: 'scarlet' },
      { id: 's5', board: 'b', x: 80, y: 26, color: 'blue' },
      { id: 's6', board: 'c', x: 20, y: 34, color: 'wood' },
      { id: 's7', board: 'c', x: 20, y: 46, color: 'purple' },
      { id: 's8', board: 'c', x: 36, y: 46, color: 'scarlet' },
      { id: 's9', board: 'd', x: 80, y: 34, color: 'blue' },
      { id: 's10', board: 'd', x: 80, y: 52, color: 'purple' },
      { id: 's11', board: 'e', x: 26, y: 78, color: 'wood' },
      { id: 's12', board: 'e', x: 70, y: 78, color: 'scarlet' },
    ],
  },
  {
    id: 'boards',
    name: '第四站 · 帳幕的板與閂',
    ref: '民數記 4:31',
    verse: '他們辦理會幕的事,就是抬帳幕的板、閂、柱子,和帶卯的座。',
    hint: '閂是橫著穿過板的——把上面的板拆完,閂才鬆得開。',
    bins: 4,
    boards: [
      { id: 'a', label: '金閂', layer: 4, x: 10, y: 14, w: 76, h: 12 },
      { id: 'b', label: '板(北)', layer: 3, x: 12, y: 22, w: 24, h: 34 },
      { id: 'c', label: '板(中)', layer: 3, x: 38, y: 22, w: 24, h: 34 },
      { id: 'd', label: '板(南)', layer: 3, x: 64, y: 22, w: 24, h: 34 },
      { id: 'e', label: '下閂', layer: 2, x: 10, y: 52, w: 76, h: 12 },
      { id: 'f', label: '帶卯的座', layer: 1, x: 18, y: 62, w: 62, h: 22 },
    ],
    screws: [
      { id: 's1', board: 'a', x: 20, y: 20, color: 'gold' },
      { id: 's2', board: 'a', x: 48, y: 20, color: 'gold' },
      { id: 's3', board: 'a', x: 76, y: 20, color: 'gold' },
      { id: 's4', board: 'b', x: 18, y: 34, color: 'wood' },
      { id: 's5', board: 'b', x: 30, y: 48, color: 'blue' },
      { id: 's6', board: 'c', x: 44, y: 34, color: 'purple' },
      { id: 's7', board: 'c', x: 56, y: 48, color: 'scarlet' },
      { id: 's8', board: 'd', x: 70, y: 34, color: 'wood' },
      { id: 's9', board: 'd', x: 82, y: 48, color: 'blue' },
      { id: 's10', board: 'e', x: 16, y: 58, color: 'purple' },
      { id: 's11', board: 'e', x: 80, y: 58, color: 'scarlet' },
      { id: 's12', board: 'f', x: 26, y: 74, color: 'wood' },
      { id: 's13', board: 'f', x: 50, y: 74, color: 'blue' },
      { id: 's14', board: 'f', x: 72, y: 74, color: 'purple' },
      { id: 's15', board: 'f', x: 62, y: 68, color: 'scarlet' },
    ],
  },
  {
    id: 'pillars',
    name: '第五站 · 柱子和帶卯的座',
    ref: '民數記 4:32',
    verse: '院子四圍的柱子和其上帶卯的座、橛子、繩子。',
    hint: '「你們要按名指定」——每根橛子都有它該去的擔子。',
    bins: 4,
    boards: [
      { id: 'a', label: '繩子', layer: 5, x: 8, y: 10, w: 82, h: 10 },
      { id: 'b', label: '柱(一)', layer: 4, x: 12, y: 18, w: 18, h: 32 },
      { id: 'c', label: '柱(二)', layer: 4, x: 34, y: 18, w: 18, h: 32 },
      { id: 'd', label: '柱(三)', layer: 4, x: 56, y: 18, w: 18, h: 32 },
      { id: 'e', label: '柱(四)', layer: 4, x: 76, y: 18, w: 16, h: 32 },
      { id: 'f', label: '橛子排', layer: 3, x: 10, y: 46, w: 80, h: 14 },
      { id: 'g', label: '帶卯的座', layer: 2, x: 16, y: 58, w: 66, h: 24 },
    ],
    screws: [
      { id: 's1', board: 'a', x: 20, y: 15, color: 'blue' },
      { id: 's2', board: 'a', x: 50, y: 15, color: 'purple' },
      { id: 's3', board: 'a', x: 80, y: 15, color: 'scarlet' },
      { id: 's4', board: 'b', x: 20, y: 30, color: 'wood' },
      { id: 's5', board: 'b', x: 20, y: 42, color: 'blue' },
      { id: 's6', board: 'c', x: 42, y: 30, color: 'wood' },
      { id: 's7', board: 'c', x: 42, y: 42, color: 'purple' },
      { id: 's8', board: 'd', x: 64, y: 30, color: 'wood' },
      { id: 's9', board: 'd', x: 64, y: 42, color: 'gold' },
      { id: 's10', board: 'e', x: 83, y: 30, color: 'gold' },
      { id: 's11', board: 'e', x: 83, y: 42, color: 'gold' },
      { id: 's12', board: 'f', x: 16, y: 52, color: 'wood' },
      { id: 's13', board: 'f', x: 50, y: 52, color: 'wood' },
      { id: 's14', board: 'f', x: 84, y: 52, color: 'wood' },
      { id: 's15', board: 'g', x: 24, y: 70, color: 'scarlet' },
      { id: 's16', board: 'g', x: 48, y: 70, color: 'blue' },
      { id: 's17', board: 'g', x: 72, y: 70, color: 'purple' },
      { id: 's18', board: 'g', x: 60, y: 78, color: 'scarlet' },
    ],
  },
  {
    id: 'veil',
    name: '第六站 · 幔子與法櫃的杠',
    ref: '民數記 4:5-6',
    verse: '亞倫和他兒子要進去摘下遮掩櫃的幔子,用以蒙蓋法櫃……把杠穿上。',
    hint: '聖物要最後才動——先把幔子摘下來蒙蓋它(民 4:15「不可摸聖物」)。',
    bins: 4,
    boards: [
      { id: 'a', label: '遮掩櫃的幔子', layer: 5, x: 18, y: 8, w: 62, h: 22 },
      { id: 'b', label: '海狗皮', layer: 4, x: 14, y: 26, w: 34, h: 20 },
      { id: 'c', label: '純藍色的毯子', layer: 4, x: 50, y: 26, w: 36, h: 20 },
      { id: 'd', label: '杠(左)', layer: 3, x: 16, y: 44, w: 14, h: 34 },
      { id: 'e', label: '杠(右)', layer: 3, x: 70, y: 44, w: 14, h: 34 },
      { id: 'f', label: '法櫃', layer: 2, x: 30, y: 48, w: 38, h: 30 },
    ],
    screws: [
      // 幔子三色線,照出 26:1「藍色、紫色、朱紅色」
      { id: 's1', board: 'a', x: 26, y: 14, color: 'blue' },
      { id: 's2', board: 'a', x: 48, y: 14, color: 'purple' },
      { id: 's3', board: 'a', x: 72, y: 14, color: 'scarlet' },
      { id: 's4', board: 'b', x: 20, y: 32, color: 'wood' },
      { id: 's5', board: 'b', x: 40, y: 32, color: 'blue' },
      { id: 's6', board: 'b', x: 20, y: 42, color: 'wood' },
      { id: 's7', board: 'c', x: 58, y: 32, color: 'blue' },
      { id: 's8', board: 'c', x: 80, y: 32, color: 'purple' },
      { id: 's9', board: 'c', x: 58, y: 42, color: 'purple' },
      { id: 's10', board: 'd', x: 22, y: 52, color: 'wood' },
      { id: 's11', board: 'd', x: 22, y: 70, color: 'scarlet' },
      { id: 's12', board: 'e', x: 76, y: 52, color: 'scarlet' },
      // 杠是皂莢木「包金」(出 25:13),所以杠上有金卯
      { id: 's13', board: 'e', x: 76, y: 70, color: 'gold' },
      { id: 's14', board: 'f', x: 38, y: 56, color: 'gold' },
      { id: 's15', board: 'f', x: 60, y: 56, color: 'gold' },
      { id: 's16', board: 'f', x: 38, y: 70, color: 'gold' },
      { id: 's17', board: 'f', x: 60, y: 70, color: 'gold' },
      { id: 's18', board: 'f', x: 49, y: 63, color: 'gold' },
    ],
  },
];
