import { getCollection, type CollectionEntry } from 'astro:content';
import { CATEGORIES, CATEGORY_IDS, type CategoryId, type Category } from './categories';

export type AnyEntry =
  | CollectionEntry<'it-ai'>
  | CollectionEntry<'kr-daily'>
  | CollectionEntry<'global-ui-ux'>;

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

/** 앞뒤 리포트 (같은 카테고리 내에서) */
export function neighbours(list: Report[], slug: string) {
  const i = list.findIndex((r) => r.slug === slug);
  return {
    newer: i > 0 ? list[i - 1]! : null,
    older: i >= 0 && i < list.length - 1 ? list[i + 1]! : null,
  };
}
