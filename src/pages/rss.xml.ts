import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllReports } from '~/lib/reports';

export async function GET(context: APIContext) {
  const reports = await getAllReports();
  return rss({
    title: 'AI Report — 전체 브리핑',
    description:
      '한국 데일리 브리핑, IT·AI 심층 스크랩, 글로벌 UI·UX 브리핑을 한 피드로 모았습니다.',
    site: context.site!,
    customData: '<language>ko-kr</language>',
    items: reports.map((r) => ({
      title: `[${r.category.short}] ${r.entry.data.title}`,
      description: r.entry.data.summary,
      pubDate: r.date,
      link: r.href,
      categories: [r.category.name, ...r.entry.data.tags],
    })),
  });
}
