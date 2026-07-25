#!/usr/bin/env node
// 除錯探針:全新無痕環境開首頁,回報「開場停在哪個畫面」;若跳進遊戲畫面,抓出是誰呼叫的。
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:8099/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const logs = [];
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const r = await page.evaluate(() => {
  const vis = (id) => !document.getElementById(id).hidden;
  return { age: vis('ageScreen'), map: vis('mapScreen'), game: vis('gameScreen'),
           title: document.getElementById('title').textContent,
           ls: Object.keys(localStorage).join(','),
           sw: !!navigator.serviceWorker.controller };
});
console.log('全新環境開場:', JSON.stringify(r, null, 1));
console.log('console:', logs.slice(0, 8).join('\n  ') || '(無)');
await browser.close();
