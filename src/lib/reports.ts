import { getCollection, type CollectionEntry } from 'astro:content';
import { CATEGORIES, CATEGORY_IDS, type CategoryId, type Category } from './categories';

export type AnyEntry =
  | CollectionEntry<'it-ai'>
  | CollectionEntry<'kr-daily'>
  | CollectionEntry<'global-ui-ux'>
  | CollectionEntry<'electronics'>
  | CollectionEntry<'health'>
  | CollectionEntry<'food-travel'>
  | CollectionEntry<'gaming'>
  | CollectionEntry<'education'>
  | CollectionEntry<'finance'>
  | CollectionEntry<'mobility'>;

export interface Report {
  entry: AnyEntry;
  category: Category;
  categoryId: CategoryId;
  slug: string;
  href: string;
  date: Date;
  dateKey: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Date 를 KST 달력 기준 문자열로. 프론트매터의 날짜는 이미 KST 날짜이므로 UTC 필드를 씁니다. */
export const toDateKey = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/**
 * KST 자정 기준 ISO 8601 문자열 (`2026-08-31T00:00:00+09:00`).
 *
 * 날짜만 있는 `2026-08-31` 도 유효한 ISO 8601 이지만, Google Rich Results Test 가
 * "datetime 값이 잘못됨 / 시간대가 누락됨" 으로 지적합니다. 프론트매터의 date 는 KST
 * 달력 날짜이므로 `+09:00` 을 붙여야 어느 타임존에서 읽어도 날짜가 밀리지 않습니다.
 * (`toISOString()` 은 UTC 자정을 내보내 9시간 어긋나므로 쓰지 마세요.)
 */
export const toIsoKst = (d: Date) => `${toDateKey(d)}T00:00:00+09:00`;

export function formatDate(d: Date, opts: { weekday?: boolean } = {}) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const base = `${y}년 ${m}월 ${day}일`;
  if (!opts.weekday) return base;
  const w = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
  return `${base} (${w})`;
}

export function formatShortDate(d: Date) {
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

export function formatMonth(monthKey: string) {
  const [y, m] = monthKey.split('-');
  return `${y}년 ${Number(m)}월`;
}

const build = (entry: AnyEntry, categoryId: CategoryId): Report => {
  const date = entry.data.date;
  const dateKey = toDateKey(date);
  return {
    entry,
    category: CATEGORIES[categoryId],
    categoryId,
    slug: entry.id,
    href: `/${categoryId}/${entry.id}/`,
    date,
    dateKey,
    monthKey: dateKey.slice(0, 7),
  };
};

/** 본문 길이 기반 예상 읽는 시간(분). 한국어 약 500자/분, 최소 1분. */
export function readingMinutes(entry: AnyEntry): number {
  const body = (entry as { body?: string }).body ?? '';
  const text = body
    .replace(/```[\s\S]*?```/g, ' ') // 코드블록 제외
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // 링크·이미지는 표시 텍스트만
    .replace(/[#>*`~|_]/g, ''); // 마크다운 기호 제거
  const chars = text.replace(/\s+/g, '').length;
  return Math.max(1, Math.round(chars / 500));
}

const notDraft = ({ data }: AnyEntry) => import.meta.env.DEV || !data.draft;

/** 전체 리포트를 최신순으로 */
export async function getAllReports(): Promise<Report[]> {
  const groups = await Promise.all(
    CATEGORY_IDS.map(async (id) => {
      const entries = (await getCollection(id, notDraft)) as AnyEntry[];
      return entries.map((e) => build(e, id));
    })
  );
  return groups.flat().sort(sortByDateDesc);
}

export async function getReportsByCategory(id: CategoryId): Promise<Report[]> {
  const entries = (await getCollection(id, notDraft)) as AnyEntry[];
  return entries.map((e) => build(e, id)).sort(sortByDateDesc);
}

function sortByDateDesc(a: Report, b: Report) {
  const diff = b.date.getTime() - a.date.getTime();
  return diff !== 0 ? diff : a.categoryId.localeCompare(b.categoryId);
}

/** 같은 날짜끼리 묶기 (최신 날짜부터) */
export function groupByDate(reports: Report[]) {
  const map = new Map<string, Report[]>();
  for (const r of reports) {
    const list = map.get(r.dateKey) ?? [];
    list.push(r);
    map.set(r.dateKey, list);
  }
  return [...map.entries()].map(([dateKey, items]) => ({
    dateKey,
    date: items[0]!.date,
    items: items.sort(
      (a, b) => CATEGORY_IDS.indexOf(a.categoryId) - CATEGORY_IDS.indexOf(b.categoryId)
    ),
  }));
}

/** 월별로 묶기 */
export function groupByMonth(reports: Report[]) {
  const map = new Map<string, Report[]>();
  for (const r of reports) {
    const list = map.get(r.monthKey) ?? [];
    list.push(r);
    map.set(r.monthKey, list);
  }
  return [...map.entries()].map(([monthKey, items]) => ({ monthKey, items }));
}

/** 태그를 URL 안전 slug 로. 한글·영숫자·하이픈만 남기고 공백은 하이픈. (예: "갤럭시 S26 FE" → "갤럭시-s26-fe") */
export const tagSlug = (tag: string) =>
  tag.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');

export interface TagGroup {
  slug: string;
  label: string;
  reports: Report[];
}

/** 전체 리포트에서 태그별 그룹 (slug 로 묶음, 리포트 최신순, 그룹은 리포트 많은 순). */
export function getAllTags(reports: Report[]): TagGroup[] {
  const map = new Map<string, TagGroup>();
  for (const r of reports) {
    for (const tag of r.entry.data.tags) {
      const slug = tagSlug(tag);
      if (!slug) continue;
      const g = map.get(slug) ?? { slug, label: tag, reports: [] };
      if (!g.reports.includes(r)) g.reports.push(r);
      map.set(slug, g);
    }
  }
  return [...map.values()].sort(
    (a, b) => b.reports.length - a.reports.length || a.label.localeCompare(b.label)
  );
}

/**
 * 태그를 공유하는 관련 리포트 (카테고리 무관). 공유 태그 수 → 최신순으로 정렬해 상위 `limit` 개.
 * 자기 자신(같은 카테고리+같은 slug)은 제외. 현재 규모(수십~수천)에선 단순 스캔으로 충분하다.
 */
export function relatedReports(report: Report, all: Report[], limit = 4): Report[] {
  const mine = new Set(report.entry.data.tags.map(tagSlug).filter(Boolean));
  if (mine.size === 0) return [];
  return all
    .filter((r) => !(r.categoryId === report.categoryId && r.slug === report.slug))
    .map((r) => ({
      r,
      shared: r.entry.data.tags.map(tagSlug).filter((s) => mine.has(s)).length,
    }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || b.r.date.getTime() - a.r.date.getTime())
    .slice(0, limit)
    .map((x) => x.r);
}

/** 앞뒤 리포트 (같은 카테고리 내에서) */
export function neighbours(list: Report[], slug: string) {
  const i = list.findIndex((r) => r.slug === slug);
  return {
    newer: i > 0 ? list[i - 1]! : null,
    older: i >= 0 && i < list.length - 1 ? list[i + 1]! : null,
  };
}
