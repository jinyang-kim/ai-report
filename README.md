# AI Report

평일 아침마다 자동으로 생성되는 세 갈래 브리핑을 한곳에 쌓는 아카이브 사이트입니다.

| 카테고리 | 경로 | 내용 |
| --- | --- | --- |
| 한국 데일리 브리핑 | `/kr-daily/` | 증시·IT 섹터·정치·날씨 |
| IT·AI 심층 스크랩 | `/it-ai/` | 프론트엔드·AI·빅테크·인프라 |
| 글로벌 UI·UX 브리핑 | `/global-ui-ux/` | 디자인 트렌드·UX 사례·리서치 수치·구현 |

## 동작 방식

```
평일 09:00 KST  예약 작업(클라우드)  ──리서치──▶  마크다운 생성
                                                    │
                              scripts/publish.py ────┤ GitHub Contents API
                                                    ▼
                                            GitHub 저장소 (main)
                                                    │ 자동 트리거
                                                    ▼
                                            Vercel 빌드 & 배포
```

예약 작업은 저장소를 clone 하지 않고 GitHub Contents API 로 마크다운 파일 하나만 PUT 합니다.
세 작업이 같은 아침에 각자 다른 경로를 쓰기 때문에 푸시 충돌이 없습니다.

## 기술 스택

- **Astro 7** — 정적 사이트 생성, 콘텐츠 컬렉션
- **의존성 3개** (astro, @astrojs/rss, @astrojs/sitemap) — 프레임워크 런타임 없음, 클라이언트 JS 최소
- **Vercel** — GitHub 연동 자동 배포

## 로컬 개발

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 로 정적 빌드
npm run preview  # 빌드 결과 미리보기
npm run check    # 타입·콘텐츠 스키마 검사
```

## 디렉터리 구조

```
src/
├── content/                 리포트 마크다운 (여기에 쌓입니다)
│   ├── kr-daily/YYYY-MM-DD.md
│   ├── it-ai/YYYY-MM-DD.md
│   └── global-ui-ux/YYYY-MM-DD.md
├── content.config.ts        프론트매터 스키마 (zod)
├── lib/
│   ├── categories.ts        카테고리 정의 · 색상 토큰
│   └── reports.ts           로딩 · 정렬 · 그룹핑 헬퍼
├── layouts/BaseLayout.astro
├── components/              Header · Footer · ReportCard
├── pages/
│   ├── index.astro          통합 최신 피드
│   ├── archive.astro        전체 아카이브 + 검색 + 필터
│   ├── [category]/          카테고리 목록 · 리포트 상세
│   ├── rss.xml.ts           전체 RSS
│   └── rss/[category].xml.ts 카테고리별 RSS
└── styles/global.css        디자인 토큰 + 전체 스타일
scripts/publish.py           예약 작업이 쓰는 커밋 스크립트
docs/SETUP.md                GitHub · Vercel 연결 절차
docs/AUTHORING.md            마크다운 작성 규격
```

## 새 리포트 추가하기 (수동)

```bash
# 파일명이 곧 URL slug 입니다
vim src/content/it-ai/2026-09-01.md
npm run build   # 스키마 위반이 있으면 여기서 잡힙니다
```

프론트매터 규격은 [docs/AUTHORING.md](docs/AUTHORING.md)를 보세요.

## 처음 세팅

[docs/SETUP.md](docs/SETUP.md) — 저장소 생성, 토큰 발급, Vercel 연결까지 순서대로.

## 알아둘 점

- **샘플 파일** — `src/content/*/2026-08-31.md` 세 개는 형식 안내용 자리표시자입니다.
  첫 실제 리포트가 들어오면 지우세요.
- **검색 범위** — 아카이브 검색은 제목·요약·핵심·태그·날짜를 대상으로 합니다. 본문 전문 검색이
  필요해지면 [Pagefind](https://pagefind.app/) 를 붙이는 게 표준 경로입니다
  (`npm i -D pagefind`, 빌드 스크립트를 `astro build && pagefind --site dist` 로 변경).
- **폰트** — Pretendard 를 jsDelivr 에서 불러오고, 실패하면 시스템 한글 폰트로 폴백합니다.
- **날짜 처리** — 프론트매터의 `date` 는 KST 달력 날짜입니다. 렌더링 시 UTC 필드를 그대로 읽어
  타임존에 따라 하루가 밀리는 문제를 막습니다.
