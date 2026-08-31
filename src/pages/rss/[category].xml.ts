import rss from '@astrojs/rss';
import type { APIContext, GetStaticPaths } from 'astro';
import { CATEGORIES, CATEGORY_LIST, type CategoryId } from '~/lib/categories';
import { getReportsByCategory } from '~/lib/reports';
import { FEED_LIMIT, feedDescription, lastBuildDate, selfLink } from '~/lib/feed';

export const getStaticPaths = (() =>
  CATEGORY_LIST.map((c) => ({ params: { category: c.id } }))) satisfies GetStaticPaths;

export async function GET(context: APIContext) {
  const id = context.params.category as CategoryId;
  const category = CATEGORIES[id];
  const all = await getReportsByCategory(id);
  const reports = all.slice(0, FEED_LIMIT);

  return rss({
    title: `AI Report — ${category.name}`,
    description: category.description,
    site: context.site!,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: [
      '<language>ko-kr</language>',
      `<lastBuildDate>${lastBuildDate(all).toUTCString()}</lastBuildDate>`,
      '<ttl>60</ttl>',
      selfLink(context.site!, `/rss/${id}.xml`),
    ].join(''),
    items: reports.map((r) => ({
      title: r.entry.data.title,
      description: feedDescription(r),
      pubDate: r.date,
      link: r.href,
      categories: r.entry.data.tags,
    })),
  });
}
