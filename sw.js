// v7(2026-07-26):音效+BGM 曲庫(audio.js,新檔!)+ 可愛風選單/地圖 + 不規則板形
// v6:各材料不同顏色/形狀 + 剩最後一根橛子時板子搖搖欲墜
// v5:新增 layout.js(幾何算式),index.html/levels.js 都改過
const CACHE_NAME = 'tabernacle-screw-v7';
const STATIC_ASSETS = ['./', './index.html', './levels.js', './layout.js', './rules.js', './tts.js', './audio.js', './manifest.json', './tts/manifest.json'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  // 統計打點絕不進快取(離線時讓它自然失敗就好)
  if (request.url.includes('/api/ping')) return;
  e.respondWith(
    caches.match(request).then((hit) =>
      hit || fetch(request).then((res) => {
        if (res.ok && new URL(request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit)
    )
  );
});
