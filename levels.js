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
//   兩隻 bot 量到分齡目標帶(青少年 12~40% 卡死/幼幼 ≤10%)、經文次序約束也過了才存進來。
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
  kinder: { id: 'kinder', label: '幼幼(4-6)', short: '幼', emoji: '🧸', bonusBins: 2, speakHowto: true,
            sub: '4-6 歲・擔子多 2 個・幾乎不會卡' },
  kids:   { id: 'kids',   label: '兒童(7-11)', short: '童', emoji: '🙂', bonusBins: 1, speakHowto: false,
            sub: '7-11 歲・擔子多 1 個・好轉身' },
  teen:   { id: 'teen',   label: '青少年(12+)', short: '青', emoji: '🧑', bonusBins: 0, speakHowto: false,
            sub: '12+・擔子最少・拆錯就卡住' },
};
export const AGE_PREF_KEY = 'hfpc-age-pref'; // 全系列共用:選一次,別關也記得
export function getAge(id) { return AGE[id] || AGE.kids; }
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
export const PILES = {"court":{"boards":{"a":[[40,29.3],[88.7,36.1],[79.5,72],[78.2,68.3],[72.7,71.1],[70.2,68.1],[66.3,70.2],[63.3,67],[59.1,69.2],[56.5,65.3],[52.2,68.2],[49.3,64.2],[45.2,67.2],[42,64.3],[37.8,66.2],[35.4,63.2],[31.4,65.3]],"b":[[28.8,39.1],[41.6,34.4],[75.4,90.6],[63.3,94]],"c":[[34.6,50.6],[72.2,48.1],[73,67],[37.4,70.1]]},"screws":{"s1":[76.2,41.8],"s2":[59.4,48.9],"s3":[77.1,57.7],"s4":[44,58.1],"s5":[36.9,45.7],"s6":[59,60.9]}},"gate":{"boards":{"a":[[20.1,4.4],[66.7,13.7],[53.2,53.7],[50.4,50.9],[46.1,52.3],[43.5,48.1],[39.1,50.9],[37.4,46.4],[32.5,49.6],[30.2,46.2],[25.8,48.3],[23.9,43.8],[19.1,47],[16.5,43.5],[12.6,45.7],[10.1,41.4],[6.3,44.4]],"b":[[55.3,78.8],[45.2,87.5],[31.4,86.4],[22.3,86.6],[9.7,89.1],[8.9,78.5],[6.2,71.5],[5.1,62.7],[12.7,55.7],[22.2,51.2],[33,49.2],[43.5,51.6],[49.2,59.1],[53.9,67.5]],"c":[[41.6,87.6],[30.3,91.8],[18.9,88],[5.5,84.4],[8.7,73.8],[6.8,64.3],[16.9,58.6],[28.1,53.9],[42.9,53.3],[46.3,64.9],[58.8,72.1],[49.4,80.9]],"d":[[18,23.4],[63.4,31],[52.3,69.5],[49.4,65.3],[45,68.3],[41.9,64.2],[37,67],[34.4,63.1],[29.6,65.7],[26.6,62.2],[22.1,64.5],[19.2,60.4],[14.5,63.2],[11.1,60],[6.9,61.9]]},"screws":{"s1":[50.3,44],"s2":[42.4,21.1],"s3":[25.7,70.2],"s4":[47.5,76.9],"s5":[10.6,69.3],"s6":[32.1,85.6],"s7":[15.7,83],"s8":[26.9,32.3],"s9":[46.3,32.6]}},"covering":{"boards":{"a":[[93.2,29.2],[93.7,36.5],[88.3,43.2],[85.5,55.9],[68.9,53],[56.1,51.9],[46.2,46.7],[40.6,39.2],[44,30.9],[40.1,19.5],[57.1,17.4],[69.5,9],[82.9,14.7],[91,21.5]],"b":[[41,34.4],[36.1,25.7],[46.4,18.5],[56.9,12.5],[69.9,13],[84.5,13.6],[92.8,21.7],[95.5,32.2],[87.7,42.6],[70.1,42.7],[58.4,43.6],[44.4,43.3]],"c":[[23.1,30.9],[73.5,43.8],[58.9,76.7],[54.8,73.8],[49.2,74.2],[45.1,69.8],[39.1,71.6],[35.1,67.7],[29,69],[25.3,65.1],[18.9,66.5],[14.5,62.6],[8.9,63.9]],"d":[[38.8,24],[94.3,34.2],[82.5,69.8],[78.9,65.6],[73.8,68.2],[70.7,64.5],[66.2,66.9],[63.2,62.7],[58.2,65.4],[54.9,62.5],[50.4,64],[47.1,60.8],[42.4,62.5],[39.1,58.2],[34.4,61],[30.9,57.6],[27.1,59.7]],"e":[[8.4,45.2],[64,39.9],[74.4,78.9],[19.9,85.6]]},"screws":{"s1":[51.6,27.6],"s2":[70,27.3],"s3":[71.5,40.9],"s4":[66.2,16.3],"s5":[52.2,39.6],"s6":[28.2,64.3],"s7":[31.8,37.4],"s8":[59.3,61.5],"s9":[76.8,53.8],"s10":[35.1,53.1],"s11":[47.6,68.7],"s12":[17.5,48.5]}},"boards":{"boards":{"a":[[14.9,40.7],[79.7,48.9],[79.7,58.9],[15.1,51.3]],"b":[[7.4,14.7],[67,11.8],[73.8,52.2],[11.1,58.3]],"c":[[24.8,31.6],[78.8,43],[67.7,79.2],[11.6,69]],"d":[[42.9,26.3],[90.1,38],[76,79.7],[24.9,67.7]],"e":[[7.1,29.7],[65,24.8],[63.4,36.5],[6.6,41.4]],"f":[[6.1,64.4],[44.6,66.5],[43.9,88.5],[5.8,86.4]]},"screws":{"s1":[16.5,48],"s2":[69.7,49.2],"s3":[40.4,48.3],"s4":[44.4,36.1],"s5":[43.1,19.1],"s6":[48.3,58],"s7":[62.1,72.8],"s8":[63.1,35.9],"s9":[83.9,42.5],"s10":[30.8,30],"s11":[11.7,35.2],"s12":[26.1,74.3],"s13":[10.6,68],"s14":[10.3,81.2],"s15":[35.4,86.1]}},"pillars":{"boards":{"a":[[16.8,61.2],[91.6,73.5],[88.9,79.4],[11.7,66.9]],"b":[[36.7,14.6],[49.3,14.8],[65,63.4],[53.5,65.4]],"c":[[18.5,8],[33.8,8.4],[37.9,69.7],[22.4,68.3]],"d":[[39.4,10.3],[53.8,4.7],[88.5,61.7],[73.9,67]],"e":[[10.4,45],[24.5,42.9],[47,92],[33.5,94.3]],"f":[[21.4,75.5],[84.6,65.8],[89.7,79.5],[22.7,88.9]],"g":[[35.1,28.9],[65.4,24.6],[69.7,44.7],[36.9,49.5]]},"screws":{"s1":[14.9,65.9],"s2":[69,73.2],"s3":[45.1,68.9],"s4":[50.8,37.9],"s5":[55.1,57.9],"s6":[27.1,21],"s7":[23.9,36.1],"s8":[57.3,17],"s9":[76.9,57.3],"s10":[28.4,54.5],"s11":[39.1,90.1],"s12":[26.9,82],"s13":[86.8,76.3],"s14":[54.7,83],"s15":[38.4,30.9],"s16":[63.9,31.1],"s17":[64.7,43.2],"s18":[39.8,46.5]}},"veil":{"boards":{"a":[[22.7,46.3],[79.7,43.1],[85.1,86.9],[78.2,82.9],[72.9,87.6],[67.6,85.6],[61.7,88.2],[55.7,84.3],[50.3,88.8],[44.4,86.4],[39.2,89.5],[32.9,87.5],[27.8,90.1]],"b":[[56.5,47],[45.2,48.2],[35.5,44.3],[25.8,42.9],[19.4,36.8],[14.1,29.1],[20.4,22.5],[19.6,10.9],[32.4,8.4],[44.3,12.3],[54.4,16.1],[60.4,23.3],[59.1,31],[67.2,41.5]],"c":[[33.3,37.8],[88.3,34.5],[90.8,70],[86.8,66.9],[82.7,70.5],[77.9,68.4],[73.5,71],[68.6,69.3],[64.3,71.6],[59.5,69.9],[55.4,72.1],[50.4,70.2],[45.8,72.7],[41.8,70],[37.8,73.2]],"d":[[22.6,34.8],[37,33.3],[36.8,81.1],[22.8,80.2]],"e":[[36,10],[50.1,7.5],[75.6,50.4],[62.3,54.6]],"f":[[17.5,60.4],[79.9,58.5],[80.5,91.2],[18.3,93.1]]},"screws":{"s1":[34.6,60.1],"s2":[31.4,80.7],"s3":[50.3,49.6],"s4":[23.9,24],"s5":[39.3,18.4],"s6":[48.2,35.6],"s7":[56.9,63.5],"s8":[80.1,53.2],"s9":[67.5,40.7],"s10":[32.4,41],"s11":[24,68.9],"s12":[61,28.1],"s13":[49.5,8.8],"s14":[64.2,75.7],"s15":[45.6,86.5],"s16":[45.5,74.2],"s17":[75.2,66.8],"s18":[70.9,86.1]}}};
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
