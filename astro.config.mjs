// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 프로덕션 도메인. canonical·og:image·JSON-LD·sitemap·RSS 의 절대 URL 이 전부 이 값에서 나옵니다.
// 도메인이 바뀌면 public/robots.txt 의 Sitemap 주소와 scripts/make-og.py 의 푸터 문구도 같이 고치세요
// (또는 Vercel 환경변수 SITE_URL 로 덮어쓰기 — 이 경우 robots.txt 는 여전히 수동입니다).
const SITE = process.env.SITE_URL ?? 'https://ai-report-navy.vercel.app';

export default defineConfig({
  site: SITE,
  integrations: [
    sitemap({
      // 매일 갱신되는 아카이브라 lastmod 가 크롤 빈도에 실제로 영향을 줍니다.
      // 리포트 URL(/<카테고리>/YYYY-MM-DD/)은 slug 가 곧 발행일이라 경로에서 바로 뽑습니다.
      serialize(item) {
        const m = new URL(item.url).pathname.match(/\/(\d{4}-\d{2}-\d{2})\/$/);
        if (m) item.lastmod = `${m[1]}T00:00:00.000Z`;
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
  build: { format: 'directory' },
});
