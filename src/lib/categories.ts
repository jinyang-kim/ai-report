export const CATEGORY_IDS = ['kr-daily', 'it-ai', 'global-ui-ux', 'electronics', 'food-travel', 'gaming', 'finance', 'mobility'] as const;
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
  electronics: {
    id: 'electronics',
    name: '전자기기',
    short: '전자',
    description: '한국 가전·모바일·반도체·IT기기의 신제품, 리뷰, 업계 소식을 정리합니다.',
    accent: '#0e9bb0',
    accentDark: '#1fb3c9',
  },
  'food-travel': {
    id: 'food-travel',
    name: '맛집·여행',
    short: '맛집',
    description: '한국에서 화제인 맛집과 여행지 — 인스타·블로그 트렌드와 검증된 정보를 함께 담습니다.',
    accent: '#d99019',
    accentDark: '#e5a72f',
  },
  gaming: {
    id: 'gaming',
    name: '게임',
    short: '게임',
    description: '온라인·모바일·콘솔 게임의 출시, 업데이트, 이스포츠와 업계 동향을 정리합니다.',
    accent: '#7c5cd6',
    accentDark: '#9377e0',
  },
  finance: {
    id: 'finance',
    name: '경제·재테크',
    short: '경제',
    description: '금리·부동산·주식·코인 등 한국 경제와 재테크 흐름을 정리합니다.',
    accent: '#94810a',
    accentDark: '#dcc24a',
  },
  mobility: {
    id: 'mobility',
    name: '자동차·모빌리티',
    short: '모빌리티',
    description: '전기차·신차·자율주행 등 자동차와 모빌리티 산업 동향을 정리합니다.',
    accent: '#d64545',
    accentDark: '#e06060',
  },
};

export const CATEGORY_LIST = CATEGORY_IDS.map((id) => CATEGORIES[id]);

export interface CategoryGroup {
  /** GNB 드롭다운 버튼 라벨 */
  label: string;
  /** 이 그룹에 속한 카테고리 — CATEGORY_IDS 부분집합, 전체 합집합은 8개 전부 */
  ids: CategoryId[];
}

/** GNB 상단 네비를 3개 드롭다운으로 묶는다 (Phase B). 순서·소속을 바꾸면 여기만 고치면 된다. */
export const CATEGORY_GROUPS: CategoryGroup[] = [
  { label: '시사·경제', ids: ['kr-daily', 'finance'] },
  { label: '기술', ids: ['it-ai', 'global-ui-ux', 'electronics', 'mobility'] },
  { label: '컬처·라이프', ids: ['food-travel', 'gaming'] },
];

export const isCategoryId = (v: string): v is CategoryId =>
  (CATEGORY_IDS as readonly string[]).includes(v);
