#!/usr/bin/env node
// 把「固定會唸的句子」用 edge-tts(微軟曉臻神經語音,免費)預烤成 mp3。
// 產物:tts/<key>.mp3 + tts/manifest.json,進 git → 離線可用、零後端、零費用。
//
// 跑法:node scripts/gen-tts.mjs        (需要網路;devDependency msedge-tts)
// ★ 累加式:已存在的檔跳過,中途失敗重跑即可補齊。
// ★ key 用 tts.js 的 ttsKey(去空白 FNV-1a),與 runtime 同一套——字串差一個字就對不上。
// ★ 地雷(照 baked-voice-commentary skill):msedge-tts 會在你搬走檔案後非同步再 unlink 一次,
//   要吞掉那個 ENOENT;而且 WebSocket 會讓行程掛住,結尾必須 process.exit。
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { LEVELS } from '../levels.js';
import { ttsKey, verseLine, toSpeakable } from '../tts.js';

process.on('uncaughtException', (e) => {
  if (e && e.code === 'ENOENT' && e.syscall === 'unlink') return; // lib 的非同步二次刪除,無害
  console.error(e);
  process.exit(1);
});

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'tts');
mkdirSync(OUT, { recursive: true });

const VOICE = 'zh-TW-HsiaoChenNeural'; // 曉臻:HFPC 經文旁白慣例

// 要烤的固定句 = 每關經文(含出處)+ 每關提示 + 一句玩法簡介(給不識字的幼兒)
const HOWTO = '把橛子一根一根拔下來,放進下面的擔子。上面還有東西壓著的,要先把上面的拆掉。同一個擔子裝滿三根一樣顏色的,利未人就扛走了。';
const LINES = [HOWTO];
for (const l of LEVELS) {
  LINES.push(verseLine(l.ref, l.verse));   // 出處唸成「第四章第二十五節」,不是「4 點 25 分」
  LINES.push(l.hint);
}

const manifestPath = join(OUT, 'manifest.json');
let manifest = {};
try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { /* 第一次 */ }
const save = () => writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n', 'utf8');

let made = 0, skipped = 0, failed = 0;
for (const raw of LINES) {
  const text = toSpeakable(raw);   // 唸法轉換後才是「真正要唸的字串」
  const key = ttsKey(text);
  const file = `${key}.mp3`;
  const fp = join(OUT, file);
  if (existsSync(fp)) { manifest[key] = `tts/${file}`; save(); skipped++; continue; }
  const tmpDir = join(OUT, `_tmp_${key}`);
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    mkdirSync(tmpDir, { recursive: true });
    const { audioFilePath } = await tts.toFile(tmpDir, text.replace(/。+/g, '。'));
    copyFileSync(audioFilePath, fp);          // 用 copy 不用 rename(見上方地雷)
    try { tts.close && tts.close(); } catch { /* socket 已關 */ }
    manifest[key] = `tts/${file}`;
    save();
    made++;
    console.log(`  ✓ ${(statSync(fp).size / 1024).toFixed(0)}KB  ${text.slice(0, 28)}…`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${text.slice(0, 28)}… ${e.message}(累加式,重跑即可補)`);
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* noop */ }
  }
}

console.log(`\n烤製完成:新增 ${made} / 已有 ${skipped} / 失敗 ${failed}(共 ${LINES.length} 句)`);
process.exit(failed ? 1 : 0); // WebSocket 會讓行程掛住,一定要 exit
