export const CATEGORY_IDS = ['kr-daily', 'it-ai', 'global-ui-ux'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Category {
  id: CategoryId;
  name: string;
  short: string;
  description: string;
  /** 검증된 팔레트 — 라이트/다크 */
  accent: string;
  accentDark: string;
}

export const CATEGORIES: Record<CategoryId, Category> = {
  'kr-daily': {
    id: 'kr-daily',
    name: '한국 데일리 브리핑',
    short: '한국',
    description: '국내외 증시와 IT·반도체 섹터, 주요 정치 뉴스, 그리고 오늘의 날씨까지 — 평일 아침 한 장에 정리합니다.',
    accent: '#eb6834',
    accentDark: '#d95926',
  },
  'it-ai': {
    id: 'it-ai',
    name: 'IT·AI 심층 스크랩',
    short: 'IT·AI',
    description: '프론트엔드, AI 모델·도구, 빅테크 동향, 백엔드·인프라. 지난 24시간의 소식을 맥락과 함께 깊게 읽습니다.',
    accent: '#2a78d6',
    accentDark: '#3987e5',
  },
  'global-ui-ux': {
    id: 'global-ui-ux',
    name: '글로벌 UI·UX 브리핑',
    short: 'UI·UX',
    description: '디자인 트렌드, 실제 UX 실패 사례, 검증된 리서치 수치, 그리고 바로 쓰는 프론트엔드 구현법.',
    accent: '#1baf7a',
    accentDark: '#199e70',
  },
};

export const CATEGORY_LIST = CATEGORY_IDS.map((id) => CATEGORIES[id]);

export const isCategoryId = (v: string): v is CategoryId =>
  (CATEGORY_IDS as readonly string[]).includes(v);
