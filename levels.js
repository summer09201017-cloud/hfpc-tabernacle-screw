// 會幕拆卸 —— 關卡資料(民數記 4:5-6, 15, 25-26, 31-32;民 1:51)
//
// 機制對應經文:
//   螺絲=橛子/卯(民 4:32「橛子、繩子」);板件=帳幕的板、閂、幔子、蓋、帷子
//   收納盒=三族的擔子:哥轄(金,聖物,肩頭抬,民 7:9)/ 革順(藍,幔子帷子,民 4:25-26)
//                      / 米拉利(棕,板閂柱座,民 4:31-32)
//   上層壓著下層才不能拆 = 民 4:5-6「先摘下幔子蒙蓋法櫃」的拆卸順序
//
// ★ 版面 v2「中央堆疊」(2026-07-26 使用者拍板):
//   所有板件不規則形狀、全部疊在舞台中間;**遮擋判定照真形狀**(rules.js pointInPoly),
//   不是矩形剪外觀。每一關的佈局(PILES)由 scripts/gen-pile.mjs 隨機搜尋、
//   兩隻 bot 量到分齡目標帶(青少年 30~55% 卡死/幼幼 ≤10%;0726 使用者嫌太簡單後上調)、
//   經文次序約束也過了才存進來。
//   ⚠ 手改 PILES 無效——重跑 `npm run tune` 會整段覆蓋;改難度請改 bins 或 under 再重生。
//
// ★ 鐵則(scripts/solver.mjs 逐關檢查,違反就不准收):
//   1. 每種顏色的螺絲總數必須是 3 的倍數(否則必有殘留湊不滿盒)
//   2. 三個年齡檔各驗「保證可解」;難度落在分齡目標帶(教學關除外)
//   3. 螺絲間距 ≥ layout.js 的 MIN_SPACING(手機上不重疊);螺絲要在自己那片板的形狀裡
import { layoutLevel } from './layout.js';

// 顏色即經文:藍紫朱紅=幔子三色線(出 26:1),木=米拉利的板閂柱座,金=哥轄的聖所器具
export const COLORS = {
  wood: { name: '板、閂、柱子、帶卯的座', hex: '#8d6e42', dark: '#5d4527', tribe: '米拉利' },
  blue: { name: '藍色線的幔子', hex: '#2f6fb5', dark: '#1d4676', tribe: '革順' },
  purple: { name: '紫色線的幔子', hex: '#7b4397', dark: '#4e2760', tribe: '革順' },
  scarlet: { name: '朱紅色線的幔子', hex: '#b83227', dark: '#7a1f18', tribe: '革順' },
  gold: { name: '聖所的器具', hex: '#c9a227', dark: '#8a6d13', tribe: '哥轄' },
};

export const AGE = {
  kinder: { id: 'kinder', label: '幼幼(4-6)', short: '幼', emoji: '🧸', bonusBins: 2, trayCap: 3, speakHowto: true,
            sub: '4-6 歲・擔子多 2 個・托盤 3 格' },
  kids:   { id: 'kids',   label: '兒童(7-11)', short: '童', emoji: '🙂', bonusBins: 1, trayCap: 2, speakHowto: false,
            sub: '7-11 歲・擔子多 1 個・托盤 2 格' },
  teen:   { id: 'teen',   label: '青少年(12+)', short: '青', emoji: '🧑', bonusBins: 0, trayCap: 1, speakHowto: false,
            sub: '12+・擔子最少・托盤只有 1 格' },
};
export const AGE_PREF_KEY = 'hfpc-age-pref'; // 全系列共用:選一次,別關也記得
export function getAge(id) { return AGE[id] || AGE.kids; }
// 托盤格數(backport 自 ezra 0726):放不進箱的先擱托盤,分齡 幼3/童2/青1
export function trayFor(ageId) { return getAge(ageId).trayCap || 0; }
export function binsFor(level, ageId) {
  return Math.min(6, level.bins + getAge(ageId).bonusBins);
}

// ── 關卡規格(板件次序=經文的由上而下;under = 經文次序硬約束:誰的橛子必須被誰蓋住)──
// mat/shape = 材質與形體(見 layout.js 的 TEMPLATE/SIZE 與 index.html 的 MAT 上色)
export const RAW = [
  {
    id: 'court', name: '第一站 · 院子的帷子', ref: '民數記 4:32',
    verse: '院子四圍的柱子和其上帶卯的座、橛子、繩子,並一切使用的器具。',
    hint: '先拆上面壓著的那片,下面的橛子才拔得出來。',
    bins: 3, teaching: true,                       // 教學關:2 色 ≤ 3 擔=永遠有空盒,專心教規則
    under: [['b', ['a']], ['c', ['b', 'a']]],      // 帷子壓柱子、柱子壓座(出 27:9-11 的院子)
    boards: [
      { id: 'a', label: '帷子', mat: 'linen', shape: 'plate' },
      { id: 'b', label: '柱子', mat: 'wood', shape: 'pillar' },
      { id: 'c', label: '帶卯的座', mat: 'bronze', shape: 'base' },
    ],
    screws: [
      { id: 's1', board: 'a', color: 'blue' }, { id: 's2', board: 'a', color: 'blue' },
      { id: 's3', board: 'a', color: 'blue' }, { id: 's4', board: 'b', color: 'wood' },
      { id: 's5', board: 'b', color: 'wood' }, { id: 's6', board: 'c', color: 'wood' },
    ],
  },
  {
    id: 'gate', name: '第二站 · 會幕的門簾', ref: '民數記 4:25',
    verse: '他們要抬帳幕的幔子和會幕,並會幕的蓋與其上的海狗皮,和會幕的門簾。',
    hint: '兩片壓在同一根橛子上時,兩片都拆掉它才會露出來。',
    bins: 2,                                       // 3 色 → 擔子 2(顏色=擔子+1 才有深度)
    under: [['d', ['a']], ['c', ['b']]],           // 門簾壓幔子;海狗皮壓會幕的蓋(出 26:14)
    boards: [
      { id: 'a', label: '門簾', mat: 'veil', shape: 'plate' },
      { id: 'b', label: '海狗皮', mat: 'seal', shape: 'plate' },
      { id: 'c', label: '會幕的蓋', mat: 'ram', shape: 'plate' },
      { id: 'd', label: '幔子', mat: 'veil', shape: 'plate' },
    ],
    screws: [
      { id: 's1', board: 'a', color: 'blue' }, { id: 's2', board: 'a', color: 'purple' },
      { id: 's3', board: 'b', color: 'wood' }, { id: 's4', board: 'b', color: 'wood' },
      { id: 's5', board: 'b', color: 'blue' }, { id: 's6', board: 'c', color: 'wood' },
      { id: 's7', board: 'c', color: 'purple' }, { id: 's8', board: 'd', color: 'blue' },
      { id: 's9', board: 'd', color: 'purple' },
    ],
  },
  {
    id: 'covering', name: '第三站 · 帳幕的蓋', ref: '民數記 4:25',
    verse: '並會幕的蓋與其上的海狗皮。',
    hint: '收納盒滿三個同色就會收走,別讓三個盒子塞滿不同顏色。',
    bins: 3,                                       // 4 色 → 擔子 3
    under: [['b', ['a']], ['e', ['c', 'd']]],      // 海狗皮壓公羊皮(出 26:14);板被幔子蓋著
    boards: [
      { id: 'a', label: '海狗皮', mat: 'seal', shape: 'plate' },
      { id: 'b', label: '公羊皮', mat: 'ram', shape: 'plate' },
      { id: 'c', label: '山羊毛幔子', mat: 'goat', shape: 'plate' },
      { id: 'd', label: '繡花幔子', mat: 'veil', shape: 'plate' },
      { id: 'e', label: '帳幕的板', mat: 'gilt', shape: 'plate' },
    ],
    screws: [
      { id: 's1', board: 'a', color: 'wood' }, { id: 's2', board: 'a', color: 'blue' },
      { id: 's3', board: 'a', color: 'purple' }, { id: 's4', board: 'b', color: 'scarlet' },
      { id: 's5', board: 'b', color: 'blue' }, { id: 's6', board: 'c', color: 'wood' },
      { id: 's7', board: 'c', color: 'purple' }, { id: 's8', board: 'c', color: 'scarlet' },
      { id: 's9', board: 'd', color: 'blue' }, { id: 's10', board: 'd', color: 'purple' },
      { id: 's11', board: 'e', color: 'wood' }, { id: 's12', board: 'e', color: 'scarlet' },
    ],
  },
  {
    id: 'boards', name: '第四站 · 帳幕的板與閂', ref: '民數記 4:31',
    verse: '他們辦理會幕的事,就是抬帳幕的板、閂、柱子,和帶卯的座。',
    hint: '閂是橫著穿過板的——把上面的板拆完,閂才鬆得開。',
    bins: 3,                                       // 5 色 → 擔子 3
    // 下閂在板之下(出 26:26-28)。座(f)本來就在最底層,堆疊重疊自然會壓住,不再硬約束
    under: [['e', ['b', 'c', 'd']]],
    boards: [
      { id: 'a', label: '金閂', mat: 'gold', shape: 'bar' },
      { id: 'b', label: '板(北)', mat: 'gilt', shape: 'plate' },
      { id: 'c', label: '板(中)', mat: 'gilt', shape: 'plate' },
      { id: 'd', label: '板(南)', mat: 'gilt', shape: 'plate' },
      { id: 'e', label: '下閂', mat: 'gold', shape: 'bar' },
      { id: 'f', label: '帶卯的座', mat: 'silver', shape: 'base' },
    ],
    screws: [
      { id: 's1', board: 'a', color: 'gold' }, { id: 's2', board: 'a', color: 'gold' },
      { id: 's3', board: 'a', color: 'gold' }, { id: 's4', board: 'b', color: 'wood' },
      { id: 's5', board: 'b', color: 'blue' }, { id: 's6', board: 'c', color: 'purple' },
      { id: 's7', board: 'c', color: 'scarlet' }, { id: 's8', board: 'd', color: 'wood' },
      { id: 's9', board: 'd', color: 'blue' }, { id: 's10', board: 'e', color: 'purple' },
      { id: 's11', board: 'e', color: 'scarlet' }, { id: 's12', board: 'f', color: 'wood' },
      { id: 's13', board: 'f', color: 'blue' }, { id: 's14', board: 'f', color: 'purple' },
      { id: 's15', board: 'f', color: 'scarlet' },
    ],
  },
  {
    id: 'pillars', name: '第五站 · 柱子和帶卯的座', ref: '民數記 4:32',
    verse: '院子四圍的柱子和其上帶卯的座、橛子、繩子。',
    hint: '「你們要按名指定」——每根橛子都有它該去的擔子。',
    bins: 3,                                       // 5 色 → 擔子 3
    teenMin: 0.2,   // 全是細長件、埋不出 30% 的卡死率——退而求其次(帶上限仍 0.55)
    // 柱子/橛子/座都是細長件,硬性互蓋幾何上湊不出來;層序(繩→柱→橛→座)已表達次序
    under: [],
    boards: [
      { id: 'a', label: '繩子', mat: 'rope', shape: 'rope' },
      { id: 'b', label: '柱(一)', mat: 'wood', shape: 'pillar' },
      { id: 'c', label: '柱(二)', mat: 'wood', shape: 'pillar' },
      { id: 'd', label: '柱(三)', mat: 'wood', shape: 'pillar' },
      { id: 'e', label: '柱(四)', mat: 'wood', shape: 'pillar' },
      { id: 'f', label: '橛子排', mat: 'bronze', shape: 'bar' },  // 出 27:19 一切的橛子都用銅做
      { id: 'g', label: '帶卯的座', mat: 'bronze', shape: 'base' }, // 出 27:10 院子=銅座(帳幕才是銀座)
    ],
    screws: [
      { id: 's1', board: 'a', color: 'blue' }, { id: 's2', board: 'a', color: 'purple' },
      { id: 's3', board: 'a', color: 'scarlet' }, { id: 's4', board: 'b', color: 'wood' },
      { id: 's5', board: 'b', color: 'blue' }, { id: 's6', board: 'c', color: 'wood' },
      { id: 's7', board: 'c', color: 'purple' }, { id: 's8', board: 'd', color: 'wood' },
      { id: 's9', board: 'd', color: 'gold' }, { id: 's10', board: 'e', color: 'gold' },
      { id: 's11', board: 'e', color: 'gold' }, { id: 's12', board: 'f', color: 'wood' },
      { id: 's13', board: 'f', color: 'wood' }, { id: 's14', board: 'f', color: 'wood' },
      { id: 's15', board: 'g', color: 'scarlet' }, { id: 's16', board: 'g', color: 'blue' },
      { id: 's17', board: 'g', color: 'purple' }, { id: 's18', board: 'g', color: 'scarlet' },
    ],
  },
  {
    id: 'veil', name: '第六站 · 幔子與法櫃的杠', ref: '民數記 4:5-6',
    verse: '亞倫和他兒子要進去摘下遮掩櫃的幔子,用以蒙蓋法櫃……把杠穿上。',
    hint: '聖物要最後才動——先把幔子摘下來蒙蓋它(民 4:15「不可摸聖物」)。',
    bins: 3,                                       // 5 色 → 擔子 3
    // ★ 神學鐵則(唯一不可放寬的一條):法櫃的每一根卯都要被「遮掩櫃的幔子」蓋住——
    //   不摘幔子就碰不到聖物(民 4:5、4:15)
    under: [['f', ['a']]],
    boards: [
      { id: 'a', label: '遮掩櫃的幔子', mat: 'veil', shape: 'plate' },
      { id: 'b', label: '海狗皮', mat: 'seal', shape: 'plate' },
      { id: 'c', label: '純藍色的毯子', mat: 'bluecloth', shape: 'plate' },
      { id: 'd', label: '杠(左)', mat: 'gold', shape: 'pillar' },   // 皂莢木包金(出 25:13)
      { id: 'e', label: '杠(右)', mat: 'gold', shape: 'pillar' },
      { id: 'f', label: '法櫃', mat: 'gold', shape: 'plate' },
    ],
    screws: [
      { id: 's1', board: 'a', color: 'blue' }, { id: 's2', board: 'a', color: 'purple' },
      { id: 's3', board: 'a', color: 'scarlet' }, { id: 's4', board: 'b', color: 'wood' },
      { id: 's5', board: 'b', color: 'blue' }, { id: 's6', board: 'b', color: 'wood' },
      { id: 's7', board: 'c', color: 'blue' }, { id: 's8', board: 'c', color: 'purple' },
      { id: 's9', board: 'c', color: 'purple' }, { id: 's10', board: 'd', color: 'wood' },
      { id: 's11', board: 'd', color: 'scarlet' }, { id: 's12', board: 'e', color: 'scarlet' },
      { id: 's13', board: 'e', color: 'gold' }, { id: 's14', board: 'f', color: 'gold' },
      { id: 's15', board: 'f', color: 'gold' }, { id: 's16', board: 'f', color: 'gold' },
      { id: 's17', board: 'f', color: 'gold' }, { id: 's18', board: 'f', color: 'gold' },
    ],
  },
];

// ⟪PILES-START⟫ gen-pile.mjs 產生(隨機搜尋 + 兩隻 bot 量測到分齡目標帶);手改無效,重跑 npm run tune 會覆蓋
export const PILES = {"court":{"boards":{"a":[[40,29.3],[88.7,36.1],[79.5,72],[78.2,68.3],[72.7,71.1],[70.2,68.1],[66.3,70.2],[63.3,67],[59.1,69.2],[56.5,65.3],[52.2,68.2],[49.3,64.2],[45.2,67.2],[42,64.3],[37.8,66.2],[35.4,63.2],[31.4,65.3]],"b":[[28.8,39.1],[41.6,34.4],[75.4,90.6],[63.3,94]],"c":[[31.9,49.3],[74.8,46.4],[75.7,68.3],[35.1,71.8]]},"screws":{"s1":[76.2,41.8],"s2":[59.4,48.9],"s3":[77.1,57.7],"s4":[44,58.1],"s5":[36.9,45.7],"s6":[58.6,62.2]}},"gate":{"boards":{"a":[[4,15.3],[50.6,7.2],[64.1,51.8],[59,48.2],[56.9,53.1],[51.8,50.3],[48.9,54.5],[43.9,52.2],[40.9,55.9],[36.1,54],[32.9,57.3],[28.2,54.5],[25.2,58.6],[19.7,55.5],[17.4,60]],"b":[[94.5,34.9],[94.2,46.3],[75.7,45.8],[66.1,49.8],[54.5,49.1],[44.6,44.4],[37.3,37.4],[35.8,28.5],[43.3,21.6],[50.7,15.6],[61.4,10.7],[76.4,8.2],[85.6,17],[91.6,25.5]],"c":[[77.7,58.7],[63,60.9],[47.6,54.8],[41.3,41.4],[38.1,29.2],[44.6,19.7],[54.5,14.3],[66.5,16.1],[77,20.4],[87.9,27.7],[92.5,39.7],[89,51.7]],"d":[[13.1,38.5],[57.7,27.6],[73.8,63],[67,61.1],[64.6,65.2],[58.6,63.8],[55.3,67.5],[49.7,66.1],[46.4,69.7],[40.8,69],[37.5,71.8],[32,70.2],[28.6,74]]},"screws":{"s1":[48.1,39.3],"s2":[36.2,49.1],"s3":[56.4,26.1],"s4":[70.2,17.2],"s5":[84.3,28.3],"s6":[87,41.5],"s7":[66.8,44],"s8":[53.8,50.6],"s9":[24.4,40.8]}},"covering":{"boards":{"a":[[73.1,75.9],[62.7,74.2],[54.7,71.1],[45.3,68.1],[42.2,60.8],[43.1,53.1],[51.6,48.8],[56.2,39.3],[68.8,37.6],[76.5,45.8],[85.7,49.4],[84.9,57.2],[92.6,65.9],[82.1,71.4]],"b":[[57.6,76.1],[42.6,71],[45.7,60.3],[46.7,51],[53.9,41.6],[70,40.1],[80.5,50.9],[94.3,55.4],[91.1,65],[91,73.7],[85.3,83.7],[69.5,78.6]],"c":[[18.9,27.6],[75.5,32.9],[68.4,78],[63.6,73.1],[58.1,77],[53.6,73.6],[48.9,76.1],[44.6,71.8],[39.1,75.2],[35.2,70.3],[29.4,74.3],[25.8,69.8],[20.1,73.4],[16.4,69.4],[11,72.6]],"d":[[18.3,22.8],[69.5,24.4],[66.4,64.7],[64.3,61.3],[60.2,64.5],[56.8,62.4],[52.4,64.3],[48.9,60.9],[45.3,64],[41.8,60.1],[38,63.8],[34.6,61.5],[31,63.6],[27.1,60.1],[23.3,63.4],[20.4,59.3],[16.9,63.2]],"e":[[6.5,45.5],[66.3,44],[67,86.2],[9.6,87.9]]},"screws":{"s1":[65.2,46.8],"s2":[62.9,63.1],"s3":[47.9,56.1],"s4":[84.6,63.1],"s5":[77.7,73.2],"s6":[34.5,62.7],"s7":[19.1,65.5],"s8":[22.9,54.4],"s9":[50.8,34.8],"s10":[24.3,31.4],"s11":[58.5,74.7],"s12":[30.2,73.6]}},"boards":{"boards":{"a":[[19.4,23.1],[79.1,19.3],[79.2,35],[20,37.3]],"b":[[17.2,15.2],[77.2,4.7],[88.7,43],[27.3,54.1]],"c":[[37.5,30.4],[89.1,36.4],[84.8,80],[34.8,74.3]],"d":[[14.8,43.7],[75.7,34.6],[87.7,79.5],[26.5,86.7]],"e":[[21.8,15.8],[95.6,23.8],[90.1,37.4],[21.6,29.5]],"f":[[13,44.7],[54.9,49.4],[48.1,73.9],[7.6,70.1]]},"screws":{"s1":[51.9,30.6],"s2":[35.7,28.6],"s3":[72,32.7],"s4":[47.7,45],"s5":[74.9,12.8],"s6":[54.2,60.9],"s7":[73.5,59.7],"s8":[74.2,74.1],"s9":[44.4,72.2],"s10":[82.4,24.1],"s11":[24.2,20.9],"s12":[12.8,60.2],"s13":[36.4,57.2],"s14":[23.8,68.8],"s15":[17.1,47.6]}},"pillars":{"boards":{"a":[[20,34.4],[88.5,44.1],[84.3,52.2],[16.9,42.3]],"b":[[27.2,27.7],[41.5,24.7],[68.3,70.9],[54.3,75.2]],"c":[[77.9,12.6],[90.8,18.5],[55.4,72.4],[41.7,67]],"d":[[33.1,6.7],[47.9,6.9],[27.1,64.4],[12.2,61.9]],"e":[[82.1,9.2],[93.7,13.4],[67.8,61.3],[54.7,59.7]],"f":[[16.6,28.2],[75,19.3],[82.7,34.5],[19.8,44.6]],"g":[[46.6,63.7],[91,62.4],[93.3,84.3],[45.6,86.5]]},"screws":{"s1":[67.6,45.7],"s2":[81.8,50.6],"s3":[48.5,42.7],"s4":[54.7,69.1],"s5":[35,36.9],"s6":[74.5,22.9],"s7":[53.2,54],"s8":[18.3,61.1],"s9":[20.7,48.9],"s10":[90.3,14.5],"s11":[80.3,34.4],"s12":[58.3,23.5],"s13":[19.4,36],"s14":[39.5,26.1],"s15":[85.4,66.3],"s16":[67.9,81.4],"s17":[49,83.2],"s18":[88.7,80.5]}},"veil":{"boards":{"a":[[26.5,46.9],[74.5,46.9],[74.5,86.7],[69.6,83.4],[64.5,86.7],[59.5,84.1],[54.9,86.7],[50.1,83.3],[45.2,86.7],[40.6,83.5],[35.8,86.8],[31.2,83],[25.6,86.8]],"b":[[43,62.3],[31,64.8],[21.9,59.3],[11.8,54.5],[10.9,45.9],[13.2,37.6],[25.1,34.2],[32.3,26.2],[43.5,30.9],[55.5,30.9],[58.1,38.9],[59,45.5],[65.8,54.7],[54.4,60.1]],"c":[[21.6,28.3],[78,43],[60.5,83.6],[56.9,78.3],[49.9,80.8],[47.2,75.7],[41.2,78.5],[37.6,74.9],[31.7,76.1],[28.4,71.7],[22.6,73.7],[19.3,69.1],[13.5,71.3],[10.7,66.7],[4.6,69]],"d":[[77.9,13],[89.7,19.9],[61.1,61.8],[45.8,58.5]],"e":[[49.2,9.1],[61.1,6.1],[86.2,65.3],[74.4,67.4]],"f":[[24.7,59.6],[77.7,60.5],[77.8,94.1],[24.7,94.6]]},"screws":{"s1":[53.5,70.8],"s2":[59.8,57.6],"s3":[44.7,56.1],"s4":[37.3,32.7],"s5":[17.9,43.6],"s6":[50.3,44.3],"s7":[30.2,62.1],"s8":[14.9,66.8],"s9":[31.3,49.3],"s10":[67.4,40.9],"s11":[80.8,23.1],"s12":[58.9,17.3],"s13":[62.7,28.8],"s14":[56.2,83.9],"s15":[35,84.9],"s16":[72.5,66.1],"s17":[72,84.2],"s18":[34.2,73.2]}}};
// ⟪PILES-END⟫

export const LAYOUT_ERRORS = [];
export const LEVELS = RAW.map((raw) => {
  try {
    if (!PILES || !PILES[raw.id]) throw new Error(`【${raw.id}】還沒有堆疊佈局——跑 npm run tune 產生`);
    const p = PILES[raw.id];
    const n = raw.boards.length;
    const level = {
      ...raw,
      boards: raw.boards.map((b, i) => ({ ...b, layer: n - i, poly: p.boards[b.id] })),
      screws: raw.screws.map((s) => ({ ...s, x: p.screws[s.id][0], y: p.screws[s.id][1] })),
    };
    return layoutLevel(level);
  } catch (e) { LAYOUT_ERRORS.push(e.message); return null; }
}).filter(Boolean);
