import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllReports } from '~/lib/reports';
import { FEED_LIMIT, feedDescription, lastBuildDate, selfLink } from '~/lib/feed';

export async function GET(context: APIContext) {
  const all = await getAllReports();
  const reports = all.slice(0, FEED_LIMIT);

  return rss({
    title: 'AI Report — 전체 브리핑',
    description:
      '한국 데일리 브리핑, IT·AI 심층 스크랩, 글로벌 UI·UX 브리핑을 한 피드로 모았습니다.',
    site: context.site!,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: [
      '<language>ko-kr</language>',
      `<lastBuildDate>${lastBuildDate(all).toUTCString()}</lastBuildDate>`,
      '<ttl>60</ttl>',
      selfLink(context.site!, '/rss.xml'),
    ].join(''),
    items: reports.map((r) => ({
      title: `[${r.category.short}] ${r.entry.data.title}`,
      description: feedDescription(r),
      pubDate: r.date,
      link: r.href,
      categories: [r.category.name, ...r.entry.data.tags],
    })),
  });
}
