import rss from '@astrojs/rss';
import type { APIContext, GetStaticPaths } from 'astro';
import { CATEGORIES, CATEGORY_LIST, type CategoryId } from '~/lib/categories';
import { getReportsByCategory } from '~/lib/reports';

export const getStaticPaths = (() =>
  CATEGORY_LIST.map((c) => ({ params: { category: c.id } }))) satisfies GetStaticPaths;

export async function GET(context: APIContext) {
  const id = context.params.category as CategoryId;
  const category = CATEGORIES[id];
  const reports = await getReportsByCategory(id);

  return rss({
    title: `AI Report — ${category.name}`,
    description: category.description,
    site: context.site!,
    customData: '<language>ko-kr</language>',
    items: reports.map((r) => ({
      title: r.entry.data.title,
      description: r.entry.data.summary,
      pubDate: r.date,
      link: r.href,
      categories: r.entry.data.tags,
    })),
  });
}
