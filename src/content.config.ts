import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 모든 리포트가 공유하는 프론트매터 규격.
 * 파일명은 반드시 `YYYY-MM-DD.md` — 이 이름이 그대로 URL slug 가 됩니다.
 * (같은 날 두 번 발행할 일이 생기면 `YYYY-MM-DD-2.md` 처럼 접미사를 붙이세요.)
 */
const reportSchema = z.object({
  /** 리포트 제목. 예: "IT·AI 심층 스크랩 — 2026-08-31" */
  title: z.string(),
  /** 발행일 (KST 기준). YYYY-MM-DD */
  date: z.coerce.date(),
  /** 목록 카드에 노출되는 한 줄 요약. 2~3문장 이내 */
  summary: z.string(),
  /** "오늘의 핵심" 3가지. 목록 카드와 상세 상단 콜아웃에 쓰입니다. */
  highlights: z.array(z.string()).default([]),
  /** 분류 태그. 예: ["React", "Vite", "코스피"] */
  tags: z.array(z.string()).default([]),
  /** 즉시 조치가 필요한 이슈가 있는 날이면 true → 목록에 🔔 배지 */
  alert: z.boolean().default(false),
  /** 인용한 출처 목록 */
  sources: z
    .array(z.object({ title: z.string(), url: z.string().url() }))
    .default([]),
  /** true 면 빌드에서 제외 */
  draft: z.boolean().default(false),
  /** 스키마 버전. 마이그레이션 추적용 */
  schemaVersion: z.string().default('1.0'),
  /** 생성 시각 (ISO 8601 KST). 예: "2026-08-31T09:00:00+09:00" */
  generatedAt: z.string().optional(),
  /** 생성 주체. "manual" | "claude-code" */
  generatedBy: z.string().optional(),
  /** 리서치에 사용한 원본 URL 목록 (sources 와 별개로 전체 추적용) */
  sourceUrls: z.array(z.string().url()).default([]),
});

export type ReportData = (typeof reportSchema)['_output'];

const collection = (dir: string) =>
  defineCollection({
    loader: glob({ pattern: '**/*.md', base: `./src/content/${dir}` }),
    schema: reportSchema,
  });

export const collections = {
  'it-ai': collection('it-ai'),
  'kr-daily': collection('kr-daily'),
  'global-ui-ux': collection('global-ui-ux'),
  electronics: collection('electronics'),
  'food-travel': collection('food-travel'),
  gaming: collection('gaming'),
  finance: collection('finance'),
  mobility: collection('mobility'),
};
