#!/usr/bin/env node
// 把「要上線的檔」複製到 dist/ —— 部署一律 deploy dist,不要 deploy 專案根目錄。
//
// ★ 由來(2026-07-25 實測):線上 https://hfpc-tabernacle-screw.pages.dev/.git/HEAD 回 200,
//   整個 .git 被公開。repo 裡雖然有 .assetsignore,但那是 **Workers assets** 的功能,
//   `wrangler pages deploy` 不吃它 → 根目錄 deploy 就把 .git 一起送上去了(07-21 四站同款事故)。
//   最穩的做法不是「列出要排除的」,而是「列出要上線的」(白名單),多一個檔都上不去。
import { cpSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');

// 白名單:出貨要的東西(tts/ 是預烤 mp3;scripts/、.git、node_modules 一律不上線)
// ⚠ 新增出貨檔一定要記得加進來(audio.js 就是 0726 新加的)——漏了線上會 404、遊戲載不起來
const SHIP = ['index.html', 'levels.js', 'layout.js', 'rules.js', 'tts.js', 'audio.js', 'sw.js',
              'manifest.json', 'icon.svg', 'tts'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let n = 0, missing = [];
for (const name of SHIP) {
  const from = join(root, name);
  if (!existsSync(from)) { missing.push(name); continue; }
  cpSync(from, join(out, name), { recursive: true });
  n += statSync(from).isDirectory() ? 1 : 1;
}

console.log(`dist/ 產好了:${n} 個項目(白名單制)`);
if (missing.length) console.log(`⚠ 白名單裡少了這些檔,請確認是不是改名了:${missing.join(', ')}`);
console.log('部署:npx wrangler pages deploy dist --project-name hfpc-tabernacle-screw --branch main');
console.log('★ 部署後務必驗一次 /.git/HEAD 應該 404(dist 裡根本沒有 .git)');
