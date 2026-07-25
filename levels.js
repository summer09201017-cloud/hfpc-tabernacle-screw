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
//   2. 每一關都要 solver 判定「保證可解」——三個年齡檔各驗一次
//   3. 螺絲間距不得小於 layout.js 的 MIN_SPACING(手機上會疊在一起=點不準)
//
// ★ 難度公式(2026-07-25「太簡單」那輪量出來的,見 scripts/depth-map.mjs / tune-columns.mjs):
//   決策深度只來自兩件事 ——
//     ① 真的層層壓住(同時能拔的螺絲要少)→ 由「疊柱」結構保證,見 layout.js
//     ② **顏色種類 = 擔子數 + 1**
//        顏色 ≤ 擔子 → 永遠有空盒,會想 bot 卡死 0%(零挑戰,第一版就是這樣)
//        顏色 ≥ 擔子+3 → 卡死 90~100%(勸退,而且常常根本無解)
//   各關的 columns / bins 都是 scripts/tune-columns.mjs 窮舉量測後挑的:
//   青少年檔「會想 bot」卡死 18~25%、幼稚園檔 0%(分齡鐵則:小的幾乎不會卡)。
//   ⚠ 改 columns 或 bins 就是改難度 —— 改完必跑 npm run check(它會擋)。
//
// 座標系:0~100 相對單位,原點左上;但**座標不再手擺**——
//   關卡只描述「哪幾片板疊成一柱、柱內從上到下的次序(=拆卸次序=經文)」,
//   幾何由 layout.js 算出來(手擺擺不出真的遮擋,也常把螺絲擺到板子外面)。
import { layoutLevel } from './layout.js';

// 顏色即經文:藍色、紫色、朱紅色是幔子的三色(出 26:1「用撚的細麻和藍色、紫色、朱紅色線製造」),
// 木色=米拉利扛的板閂柱座,金色=哥轄扛的聖所器具。
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
// ★ 標籤與級距照 tsum 七款的慣例(幼幼 4-6 / 兒童 7-11 / 青少年 12+),
//   副標一律「講清楚這一檔的機制差別」——這款的機制旋鈕就是擔子數。
export const AGE = {
  kinder: { id: 'kinder', label: '幼幼(4-6)', emoji: '🧸', bonusBins: 2, speakHowto: true,
            sub: '擔子多 2 個・幾乎不會卡・不識字也能玩(自動唸玩法)' },
  kids:   { id: 'kids',   label: '兒童(7-11)', emoji: '🙂', bonusBins: 1, speakHowto: false,
            sub: '擔子多 1 個・好轉身・一般玩法' },
  teen:   { id: 'teen',   label: '青少年(12+)', emoji: '🧑', bonusBins: 0, speakHowto: false,
            sub: '擔子最少・拆錯順序就卡住・想一下再拆' },
};
export const AGE_PREF_KEY = 'hfpc-age-pref'; // 全系列共用:選一次,別關也記得
export function getAge(id) { return AGE[id] || AGE.kids; }
/** 這一關在這個年齡檔實際有幾個擔子 */
export function binsFor(level, ageId) {
  return Math.min(6, level.bins + getAge(ageId).bonusBins);
}

// 板件形狀只有 rect(矩形)——會幕的板本來就是長方形(出 26:16),不需要多餘形狀
const RAW = [
  {
    id: 'court',
    name: '第一站 · 院子的帷子',
    ref: '民數記 4:32',
    verse: '院子四圍的柱子和其上帶卯的座、橛子、繩子,並一切使用的器具。',
    hint: '先拆上面壓著的那片,下面的橛子才拔得出來。',
    bins: 3,
    teaching: true,              // 出廠檢驗知道這關「本來就不該卡死」,不當紅燈
    // 教學關:只有兩種顏色(=永遠有空擔子),故意不會卡死,專心教「上面壓著就拔不動」。
    // 一柱三層,由上而下就是院子的拆法:帷子 → 柱子 → 帶卯的座。
    columns: [['a', 'b', 'c']],
    boards: [
      { id: 'a', label: '帷子' },
      { id: 'b', label: '柱子' },
      { id: 'c', label: '帶卯的座' },
    ],
    screws: [
      { id: 's1', board: 'a', color: 'blue' },
      { id: 's2', board: 'a', color: 'blue' },
      { id: 's3', board: 'a', color: 'blue' },
      { id: 's4', board: 'b', color: 'wood' },
      { id: 's5', board: 'b', color: 'wood' },
      { id: 's6', board: 'c', color: 'wood' },
    ],
  },
  {
    id: 'gate',
    name: '第二站 · 會幕的門簾',
    ref: '民數記 4:25',
    verse: '他們要抬帳幕的幔子和會幕,並會幕的蓋與其上的海狗皮,和會幕的門簾。',
    hint: '兩片壓在同一根橛子上時,兩片都拆掉它才會露出來。',
    bins: 2,                     // 3 色 → 擔子 2(顏色=擔子+1)。第一關會卡的站。
    // 門簾在最外、幔子在最內(所以同一柱:門簾壓著幔子);
    // 海狗皮是最外層的頂蓋(出 26:14),壓著會幕的蓋。
    columns: [['a', 'd'], ['b', 'c']],
    boards: [
      { id: 'a', label: '門簾' },
      { id: 'b', label: '海狗皮' },
      { id: 'c', label: '會幕的蓋' },
      { id: 'd', label: '幔子' },
    ],
    screws: [
      { id: 's1', board: 'a', color: 'blue' },
      { id: 's2', board: 'a', color: 'purple' },
      { id: 's3', board: 'b', color: 'wood' },
      { id: 's4', board: 'b', color: 'wood' },
      { id: 's5', board: 'b', color: 'blue' },
      { id: 's6', board: 'c', color: 'wood' },
      { id: 's7', board: 'c', color: 'purple' },
      { id: 's8', board: 'd', color: 'blue' },
      { id: 's9', board: 'd', color: 'purple' },
    ],
  },
  {
    id: 'covering',
    name: '第三站 · 帳幕的蓋',
    ref: '民數記 4:25',
    verse: '並會幕的蓋與其上的海狗皮。',
    hint: '收納盒滿三個同色就會收走,別讓三個盒子塞滿不同顏色。',
    bins: 3,                     // 4 色 → 擔子 3
    // 第一柱就是出 26:14 的由外而內:海狗皮 → 染紅公羊皮 → 山羊毛幔子;
    // 第二柱是最裡面兩層:繡花幔子壓著帳幕的板。量到 青少年 18% / 躺平 78%。
    columns: [['a', 'b', 'c'], ['d', 'e']],
    boards: [
      { id: 'a', label: '海狗皮' },
      { id: 'b', label: '公羊皮' },
      { id: 'c', label: '山羊毛幔子' },
      { id: 'd', label: '繡花幔子' },
      { id: 'e', label: '帳幕的板' },
    ],
    screws: [
      { id: 's1', board: 'a', color: 'wood' },
      { id: 's2', board: 'a', color: 'blue' },
      { id: 's3', board: 'a', color: 'purple' },
      { id: 's4', board: 'b', color: 'scarlet' },
      { id: 's5', board: 'b', color: 'blue' },
      { id: 's6', board: 'c', color: 'wood' },
      { id: 's7', board: 'c', color: 'purple' },
      { id: 's8', board: 'c', color: 'scarlet' },
      { id: 's9', board: 'd', color: 'blue' },
      { id: 's10', board: 'd', color: 'purple' },
      { id: 's11', board: 'e', color: 'wood' },
      { id: 's12', board: 'e', color: 'scarlet' },
    ],
  },
  {
    id: 'boards',
    name: '第四站 · 帳幕的板與閂',
    ref: '民數記 4:31',
    verse: '他們辦理會幕的事,就是抬帳幕的板、閂、柱子,和帶卯的座。',
    hint: '閂是橫著穿過板的——把上面的板拆完,閂才鬆得開。',
    bins: 3,                     // 5 色 → 擔子 3(第一版是 4,量到 0% 卡死=沒挑戰)
    // 上閂在板之上、下閂在板之下(出 26:26-27 五閂穿過板),座在板之下(出 26:19):
    //   柱1 金閂壓著板(中) · 柱2 板(北)壓著下閂 · 柱3 板(南)壓著帶卯的座。
    // 三種關係都對得上經文,量到 青少年 20% / 躺平 79%。
    columns: [['a', 'c'], ['b', 'e'], ['d', 'f']],
    boards: [
      { id: 'a', label: '金閂' },
      { id: 'b', label: '板(北)' },
      { id: 'c', label: '板(中)' },
      { id: 'd', label: '板(南)' },
      { id: 'e', label: '下閂' },
      { id: 'f', label: '帶卯的座' },
    ],
    screws: [
      { id: 's1', board: 'a', color: 'gold' },
      { id: 's2', board: 'a', color: 'gold' },
      { id: 's3', board: 'a', color: 'gold' },
      { id: 's4', board: 'b', color: 'wood' },
      { id: 's5', board: 'b', color: 'blue' },
      { id: 's6', board: 'c', color: 'purple' },
      { id: 's7', board: 'c', color: 'scarlet' },
      { id: 's8', board: 'd', color: 'wood' },
      { id: 's9', board: 'd', color: 'blue' },
      { id: 's10', board: 'e', color: 'purple' },
      { id: 's11', board: 'e', color: 'scarlet' },
      { id: 's12', board: 'f', color: 'wood' },
      { id: 's13', board: 'f', color: 'blue' },
      { id: 's14', board: 'f', color: 'purple' },
      { id: 's15', board: 'f', color: 'scarlet' },
    ],
  },
  {
    id: 'pillars',
    name: '第五站 · 柱子和帶卯的座',
    ref: '民數記 4:32',
    verse: '院子四圍的柱子和其上帶卯的座、橛子、繩子。',
    hint: '「你們要按名指定」——每根橛子都有它該去的擔子。',
    bins: 3,                     // 5 色 / 擔子 3
    // 繩子先解(壓著柱一),每根柱子卸下後才露出它底下的橛子或帶卯的座(民 4:32 的清單次序)。
    // 四柱並排=四個獨立的小決定同時擺在眼前,量到 青少年 26% / 躺平 96%。
    columns: [['a', 'b'], ['c'], ['d', 'g'], ['e', 'f']],
    boards: [
      { id: 'a', label: '繩子' },
      { id: 'b', label: '柱(一)' },
      { id: 'c', label: '柱(二)' },
      { id: 'd', label: '柱(三)' },
      { id: 'e', label: '柱(四)' },
      { id: 'f', label: '橛子排' },
      { id: 'g', label: '帶卯的座' },
    ],
    screws: [
      { id: 's1', board: 'a', color: 'blue' },
      { id: 's2', board: 'a', color: 'purple' },
      { id: 's3', board: 'a', color: 'scarlet' },
      { id: 's4', board: 'b', color: 'wood' },
      { id: 's5', board: 'b', color: 'blue' },
      { id: 's6', board: 'c', color: 'wood' },
      { id: 's7', board: 'c', color: 'purple' },
      { id: 's8', board: 'd', color: 'wood' },
      { id: 's9', board: 'd', color: 'gold' },
      { id: 's10', board: 'e', color: 'gold' },
      { id: 's11', board: 'e', color: 'gold' },
      { id: 's12', board: 'f', color: 'wood' },
      { id: 's13', board: 'f', color: 'wood' },
      { id: 's14', board: 'f', color: 'wood' },
      { id: 's15', board: 'g', color: 'scarlet' },
      { id: 's16', board: 'g', color: 'blue' },
      { id: 's17', board: 'g', color: 'purple' },
      { id: 's18', board: 'g', color: 'scarlet' },
    ],
  },
  {
    id: 'veil',
    name: '第六站 · 幔子與法櫃的杠',
    ref: '民數記 4:5-6',
    verse: '亞倫和他兒子要進去摘下遮掩櫃的幔子,用以蒙蓋法櫃……把杠穿上。',
    hint: '聖物要最後才動——先把幔子摘下來蒙蓋它(民 4:15「不可摸聖物」)。',
    bins: 3,                     // 5 色 → 擔子 3
    // ★ 神學鐵則(已寫成 tune-columns 的硬約束 --under f:a,不靠人工從候選裡挑):
    //   法櫃必須壓在「遮掩櫃的幔子」底下 → 不摘幔子就碰不到聖物(民 4:5、4:15)。
    //   柱1:幔子 → 法櫃 → 杠(右)(民 4:6「把杠穿上」= 最後才動);
    //   柱2:海狗皮 → 純藍色的毯子 → 杠(左),也是民 4:6 的次序。
    //   量到 青少年 26% / 躺平 92%,是全關最難的一站(終站該最難)。
    columns: [['a', 'f', 'e'], ['b', 'c', 'd']],
    boards: [
      { id: 'a', label: '遮掩櫃的幔子' },
      { id: 'b', label: '海狗皮' },
      { id: 'c', label: '純藍色的毯子' },
      { id: 'd', label: '杠(左)' },
      { id: 'e', label: '杠(右)' },
      { id: 'f', label: '法櫃' },
    ],
    screws: [
      // 幔子三色線,照出 26:1「藍色、紫色、朱紅色」
      { id: 's1', board: 'a', color: 'blue' },
      { id: 's2', board: 'a', color: 'purple' },
      { id: 's3', board: 'a', color: 'scarlet' },
      { id: 's4', board: 'b', color: 'wood' },
      { id: 's5', board: 'b', color: 'blue' },
      { id: 's6', board: 'b', color: 'wood' },
      { id: 's7', board: 'c', color: 'blue' },
      { id: 's8', board: 'c', color: 'purple' },
      { id: 's9', board: 'c', color: 'purple' },
      { id: 's10', board: 'd', color: 'wood' },
      { id: 's11', board: 'd', color: 'scarlet' },
      { id: 's12', board: 'e', color: 'scarlet' },
      // 杠是皂莢木「包金」(出 25:13),所以杠上有金卯
      { id: 's13', board: 'e', color: 'gold' },
      { id: 's14', board: 'f', color: 'gold' },
      { id: 's15', board: 'f', color: 'gold' },
      { id: 's16', board: 'f', color: 'gold' },
      { id: 's17', board: 'f', color: 'gold' },
      { id: 's18', board: 'f', color: 'gold' },
    ],
  },
];

export { RAW };   // 工具(tune-columns)要吃「還沒排版」的規格,所以也對外開放

// 幾何一律算出來(見 layout.js):遮擋深度由結構保證,螺絲不可能掉到板子外面。
// ★ 排不下的關卡不 throw、而是收進 LAYOUT_ERRORS:
//   throw 會讓整個模組載不起來,連調校工具都跑不了(改難度時是死結)。
//   改成:遊戲開頭紅字報錯(老師看得到)、npm run check 直接擋(見 solver.mjs),
//   工具照樣能用 RAW 重新搜一組排得下的分法。
export const LAYOUT_ERRORS = [];
export const LEVELS = RAW.map((l) => {
  try { return layoutLevel(l); } catch (e) { LAYOUT_ERRORS.push(e.message); return null; }
}).filter(Boolean);
