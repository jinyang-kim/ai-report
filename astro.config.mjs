// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Vercel 배포 후 실제 도메인으로 바꾸거나, Vercel 환경변수 SITE_URL 로 주입하세요.
const SITE = process.env.SITE_URL ?? 'https://ai-report.vercel.app';

export default defineConfig({
  site: SITE,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
  build: { format: 'directory' },
});
