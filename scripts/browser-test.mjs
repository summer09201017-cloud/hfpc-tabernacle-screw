#!/usr/bin/env node
// 瀏覽器實測:真的開頁、真的點螺絲、真的通關(solver 說可解 ≠ 畫面點得動)
// 跑法:先開好本機伺服器,再 node scripts/browser-test.mjs [http://127.0.0.1:8099]
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8099';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone 直向
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
// 從第一關開始(清掉上次進度)
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

let cleared = 0;
for (let lv = 1; lv <= 6; lv++) {
  const title = await page.textContent('#title');
  const bins = await page.locator('.bin').count();
  let taps = 0;
  // 玩法:一直用「💡 提示」找出安全的一步再點它——等於用畫面本身走一次保證解
  for (;;) {
    const left = await page.locator('.screw:not(.gone)').count();
    if (left === 0) break;
    if (++taps > 40) throw new Error(`${title} 點了 40 次還沒通關,卡住了`);
    await page.click('#hint');
    const hinted = page.locator('.screw.hint');
    if (!(await hinted.count())) throw new Error(`${title} 提示找不到安全的一步(第 ${taps} 手)`);
    await hinted.first().click();
    await page.waitForTimeout(30);
  }
  const msg = await page.textContent('#msg');
  console.log(`  🟢 ${title}(擔子 ${bins} 個)—— ${taps} 手拆完:${msg.trim()}`);
  cleared++;
  const next = page.locator('#next');
  if (await next.isVisible()) { await next.click(); await page.waitForTimeout(120); }
}

// 最後一關要跳完成對話框
const dlgOpen = await page.evaluate(() => document.getElementById('dlg').open);
console.log(`  ${dlgOpen ? '🟢' : '🔴'} 全破對話框${dlgOpen ? '有跳出' : '沒跳出'}`);

// 直向不該出現橫向捲軸(手機友善)
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
console.log(`  ${overflow ? '🔴' : '🟢'} iPhone 直向${overflow ? '有' : '無'}橫向溢出`);

await browser.close();
const bad = errors.length || !dlgOpen || overflow || cleared !== 6;
if (errors.length) { console.log('\n🔴 主控台錯誤:'); errors.forEach((e) => console.log('   ' + e)); }
console.log(bad ? '\n🔴 瀏覽器實測未通過' : `\n🟢 瀏覽器實測通過:${cleared} 關全部真的點得動、點得完`);
process.exitCode = bad ? 1 : 0;
