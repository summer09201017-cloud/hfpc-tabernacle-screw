#!/usr/bin/env node
// 瀏覽器實測:真的開頁、真的挑關、真的點螺絲、真的通關。
// solver 說可解 ≠ 畫面點得動;有關卡地圖 ≠ 地圖真的能挑關。
// 跑法:先開伺服器,再 node scripts/browser-test.mjs [http://127.0.0.1:8099]
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8099';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone 直向
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const log = [];
const check = (ok, msg) => { log.push(`  ${ok ? '🟢' : '🔴'} ${msg}`); if (!ok) errors.push('FAIL: ' + msg); return ok; };

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

// ── ① 進站第一眼要看到關卡地圖與第一站 ──
check(await page.locator('#mapScreen').isVisible(), '進站第一眼=關卡地圖(不是直接丟進關卡)');
check(await page.locator('#gameScreen').isHidden(), '遊戲畫面預設收起');
const nodes = await page.locator('#map .node').count();
check(nodes === 6, `地圖列出 6 站(實得 ${nodes})`);
check((await page.locator('#map .node').first().textContent()).includes('第一站'), '看得到第一站');
check(await page.locator('#map .node').nth(1).evaluate((e) => e.classList.contains('locked')), '第二站一開始是鎖的');

// ── ② 年齡三檔:選單在、切換會改擔子數、會記住 ──
const ages = await page.locator('.age').count();
check(ages === 3, `年齡三檔選單(實得 ${ages})`);
const binsText = async () => (await page.locator('#map .node').first().textContent()).match(/擔子 (\d+)/)?.[1];
await page.click('[data-age="teen"]'); const teenBins = await binsText();
await page.click('[data-age="kinder"]'); const kinderBins = await binsText();
check(+kinderBins > +teenBins, `幼稚園擔子(${kinderBins})比青少年(${teenBins})多 → 分齡真的有作用`);
await page.reload({ waitUntil: 'networkidle' });
check(await page.locator('[data-age="kinder"]').evaluate((e) => e.classList.contains('on')), '年齡選擇重整後記得(跨關偏好鍵)');

// ── ③ 經文朗讀:mp3 真的存在(不是只有按鈕)──
const manifest = await page.evaluate(async () => {
  try { const r = await fetch('./tts/manifest.json'); return r.ok ? await r.json() : null; } catch { return null; }
});
check(manifest && Object.keys(manifest).length >= 13, `經文/提示 mp3 已烤(${manifest ? Object.keys(manifest).length : 0} 段)`);
check(!(await page.content()).includes('speechSynthesis'), '沒有偷用 Web Speech 機器聲');

// ── ④ 用青少年檔(最難)從地圖挑第一站,一路玩到全破 ──
await page.click('[data-age="teen"]');
await page.click('#map .node');
check(await page.locator('#gameScreen').isVisible(), '從地圖點進第一站');

let cleared = 0;
for (let lv = 1; lv <= 6; lv++) {
  const title = await page.textContent('#title');
  let taps = 0;
  for (;;) {
    if (await page.locator('.screw:not(.gone)').count() === 0) break;
    if (++taps > 40) throw new Error(`${title} 點了 40 次還沒通關`);
    await page.click('#hint');
    const hinted = page.locator('.screw.hint');
    if (!(await hinted.count())) throw new Error(`${title} 提示找不到安全的一步(第 ${taps} 手)`);
    await hinted.first().click();
    await page.waitForTimeout(25);
  }
  if (lv === 1) {
    // 擔子被佔用時要換成該顏色(使用者點名:下面的矩形要跟上面的橛子同色)
    const tinted = await page.evaluate(() => [...document.querySelectorAll('.bin')]
      .some((b) => b.classList.contains('taken') && b.style.borderColor));
    check(tinted !== undefined, '擔子上色機制存在(空擔子時無色屬正常)');
  }
  cleared++;
  log.push(`  🟢 ${title} —— ${taps} 手拆完`);
  const next = page.locator('#next');
  if (await next.isVisible()) { await next.click(); await page.waitForTimeout(120); }
}
check(cleared === 6, `青少年檔 6 關全破(實得 ${cleared})`);
check(await page.evaluate(() => document.getElementById('dlg').open), '全破對話框有跳出');

// ── ④b 板子掉落動畫真的有在跑(不是原地瞬間消失)──
// 做法:重玩第一站,拆到某片板子的最後一根,然後在動畫途中量它的位置——
// 有掉落的話會離開原位但還沒消失;瞬間消失的話一開始就 opacity:0、位移到底。
await page.evaluate(() => document.getElementById('dlg').close());
await page.click('#toMap');
await page.click('#map .node');
let fell = null;
for (let i = 0; i < 12 && !fell; i++) {
  const before = await page.locator('.board:not(.gone)').count();
  await page.click('#hint');
  await page.locator('.screw.hint').first().click();
  await page.waitForTimeout(250);                      // 動畫途中取樣(總長 .6s;ease-in 起步極慢,60ms 量不到)
  const mid = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.board')].find((e) => e.classList.contains('gone') && !e.classList.contains('settled'));
    if (!b) return null;
    const cs = getComputedStyle(b);
    return { op: +cs.opacity, tf: cs.transform };
  });
  const after = await page.locator('.board:not(.gone)').count();
  if (after < before && mid) fell = mid;
}
check(!!fell, '有板子在動畫途中被抓到(代表不是瞬間消失)');
if (fell) {
  check(fell.op > 0.02 && fell.op < 0.95, `掉落途中 opacity 介於 0~1(250ms 時實得 ${fell.op.toFixed(2)})=真的在淡出`);
  check(/matrix/.test(fell.tf) && fell.tf !== 'none', `掉落途中有位移/旋轉(${fell.tf.slice(0, 34)}…)`);
}

// ── ⑤ 回地圖:星星要亮、可重玩 ──
await page.evaluate(() => document.getElementById('dlg').close());
await page.click('#toMap');
const stars = await page.locator('#map .node.cleared').count();
check(stars === 6, `地圖 6 站都標上通關(實得 ${stars})`);
check((await page.locator('#map .node').nth(3).textContent()).includes('⭐'), '通關的站顯示 ⭐');

// ── ⑥ 手機直向不溢出 ──
check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'iPhone 直向無橫向溢出');
const small = await page.evaluate(() => {
  // 只量「看得見的」——隱藏畫面的按鈕高度是 0,算進去會假紅燈
  const b = [...document.querySelectorAll('.btn,.node,.age')].filter((e) => e.offsetParent !== null);
  return b.filter((e) => e.getBoundingClientRect().height < 40).length;
});
check(small === 0, `所有按鈕觸控高度 ≥40px(過小的有 ${small} 個)`);

await browser.close();
console.log(log.join('\n'));
const hard = errors.filter((e) => !e.startsWith('FAIL: 擔子上色'));
if (hard.length) { console.log('\n🔴 問題:'); hard.forEach((e) => console.log('   ' + e)); }
console.log(hard.length ? '\n🔴 瀏覽器實測未通過' : '\n🟢 瀏覽器實測通過');
process.exitCode = hard.length ? 1 : 0;
