import type { Report } from './reports';

/**
 * 피드에 담을 최대 항목 수.
 * 브리핑은 평일마다 3건씩 쌓이므로 무제한으로 두면 1년 뒤 XML 이 수 MB 가 됩니다.
 * 리더는 과거 항목을 자체 보관하므로 최근 것만 실어도 이력이 끊기지 않습니다.
 */
export const FEED_LIMIT = 60;

/** RSS 항목 본문 — 요약 + "오늘의 핵심" 목록을 HTML 로 */
export function feedDescription(report: Report): string {
  const { summary, highlights } = report.entry.data;
  if (highlights.length === 0) return escapeHtml(summary);
  const items = highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('');
  return `<p>${escapeHtml(summary)}</p><p><strong>오늘의 핵심</strong></p><ul>${items}</ul>`;
}

/** 피드 채널의 lastBuildDate — 가장 최근 리포트 발행 시각 */
export function lastBuildDate(reports: Report[]): Date {
  return reports[0]?.date ?? new Date();
}

/** RSS 2.0 권장: 피드 자신의 주소를 atom:link 로 명시 */
export function selfLink(site: URL, pathname: string): string {
  return `<atom:link href="${new URL(pathname, site).href}" rel="self" type="application/rss+xml"/>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
