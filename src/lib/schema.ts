import type { Report } from './reports';
import type { Category } from './categories';

/**
 * schema.org 구조화 데이터 생성기.
 * 프론트매터에 이미 있는 값만 씁니다 — 리포트 작성 시 추가로 채울 항목이 없습니다.
 *
 * 날짜는 `Report.dateKey`(YYYY-MM-DD)를 그대로 넘깁니다. 이 값은 reports.ts 에서
 * UTC 게터로 만들어진 KST 달력 날짜라, 여기서 Date 를 다시 포맷하면 하루가 밀립니다.
 */

const SITE_NAME = 'AI Report';

const publisher = (site: URL) => ({
  '@type': 'Organization',
  name: SITE_NAME,
  url: site.href,
});

const abs = (site: URL, path: string) => new URL(path, site).href;

export function websiteSchema(site: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: site.href,
    inLanguage: 'ko-KR',
    description:
      '한국 데일리 브리핑, IT·AI 심층 스크랩, 글로벌 UI·UX 브리핑을 매일 아침 쌓는 아카이브입니다.',
    publisher: publisher(site),
  };
}

export function blogPostingSchema(report: Report, site: URL, image: string) {
  const { entry, category, href, dateKey } = report;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: entry.data.title,
    description: entry.data.summary,
    url: abs(site, href),
    mainEntityOfPage: { '@type': 'WebPage', '@id': abs(site, href) },
    datePublished: dateKey,
    dateModified: dateKey,
    inLanguage: 'ko-KR',
    articleSection: category.name,
    image: abs(site, image),
    author: publisher(site),
    publisher: publisher(site),
    ...(entry.data.tags.length > 0 && { keywords: entry.data.tags.join(', ') }),
    ...(entry.data.sources.length > 0 && {
      citation: entry.data.sources.map((s) => ({
        '@type': 'CreativeWork',
        name: s.title,
        url: s.url,
      })),
    }),
  };
}

export function breadcrumbSchema(site: URL, trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: abs(site, t.path),
    })),
  };
}

export function collectionSchema(
  site: URL,
  opts: { name: string; description: string; path: string; reports: Report[] }
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: abs(site, opts.path),
    inLanguage: 'ko-KR',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: site.href },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: opts.reports.length,
      itemListElement: opts.reports.slice(0, 20).map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: r.entry.data.title,
        url: abs(site, r.href),
      })),
    },
  };
}

/** 카테고리별 OG 이미지 경로 */
export const ogImageFor = (category?: Category) =>
  category ? `/og/${category.id}.png` : '/og/default.png';
