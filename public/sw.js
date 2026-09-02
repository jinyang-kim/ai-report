// AI Report 서비스 워커 — 설치형 PWA + 오프라인 복원력.
// 전략: 해시 정적 자산(_astro/fonts/og/icons/pagefind)은 캐시 우선(불변),
//       문서(내비게이션)는 네트워크 우선 + 캐시 폴백(매일 갱신되는 아카이브라 항상 최신 우선).
// 프레임워크·빌드 플러그인 없이 손으로 작성 — 정적 사이트 무의존성 유지.
const CACHE = 'ai-report-v1';
const STATIC = /^\/(_astro|fonts|og|icons|pagefind)\//;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add('/')).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (STATIC.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok) c.put(req, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
    );
  }
});
