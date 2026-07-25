#!/usr/bin/env node
// 呼叫 game-must-haves skill 的驗收器(六件必備:關卡地圖/分齡/朗讀/返回大廳/統計打點/出廠檢驗)。
//
// ★ 為什麼要這層轉接:原本 package.json 直接寫死
//   "node C:/Users/agape250/.claude/skills/..." —— 換一台 PC(這台是 C:\Users\HFP)整個 npm test 就掛。
//   驗收器裝在各人的 ~/.claude 下,路徑只能執行時算。
// ★ 找不到 skill 時「說清楚怎麼補」而不是無聲跳過:無聲跳過會讓缺件的遊戲拿到綠燈。
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const checker = join(homedir(), '.claude', 'skills', 'game-must-haves', 'scripts', 'check-must-haves.mjs');
if (!existsSync(checker)) {
  console.error(`🔴 找不到六件必備驗收器:${checker}`);
  console.error('   → 這台機器還沒裝 game-must-haves skill。跑一次 skills repo 的 install.bat 就有了。');
  process.exit(1);
}
try {
  execFileSync(process.execPath, [checker, '.'], { stdio: 'inherit' });
} catch (e) {
  process.exit(e.status || 1);
}
