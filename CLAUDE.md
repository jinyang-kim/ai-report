# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트

Astro 7 정적 사이트. 평일 아침 예약 작업(클라우드)이 생성한 세 갈래 브리핑 마크다운을 GitHub `main` 에
커밋하면 Vercel 이 자동 재배포하는 아카이브입니다. 런타임 의존성은 3개
(astro, @astrojs/rss, @astrojs/sitemap)뿐이고 프레임워크 런타임이 없습니다. 개발 의존성 2개
(@astrojs/check, typescript)는 `npm run check` 전용이라 빌드 산출물에 들어가지 않습니다.
UI 문구와 콘텐츠는 전부 한국어입니다.

## 명령

**Node 22.12.0 이상이 필요합니다** (`.nvmrc` · `package.json` engines). Node 20 에서는 `astro build` 가
`Node.js v20.x is not supported by Astro!` 로 즉시 중단됩니다. 또 Node 20 에서 `npm install` 을 돌리면
`@rolldown/binding-*` 이 EBADENGINE 으로 건너뛰어져, 나중에 Node 22 로 바꿔도
`Cannot find native binding` 이 납니다 — 이때는 `node_modules` 와 `package-lock.json` 을 지우고
Node 22 에서 다시 설치해야 합니다.

```bash
npm run dev      # http://localhost:4321
npm run build    # dist/ 정적 빌드 — 콘텐츠 스키마 검증 게이트
npm run preview
npm run check    # astro check (타입 + 콘텐츠 스키마)

python3 scripts/make-og.py   # public/og/*.png 재생성 (카테고리·브랜드 변경 시에만)
```

테스트 스위트와 린터가 없습니다. 검증 게이트는 두 개입니다.

- `npm run build` — 프론트매터가 `src/content.config.ts` 의 zod 스키마에 어긋나면 파일·필드 단위로
  잡힙니다. **타입은 보지 않습니다.** 콘텐츠나 스키마를 건드린 뒤에는 반드시 실행하세요.
- `npm run check` — 타입까지 봅니다. `.astro`/`.ts` 를 고쳤다면 이쪽도 돌리세요.
  zod 관련 deprecation hint 가 여럿 나오지만 error 0 이면 통과입니다.

## 아키텍처

### 콘텐츠 파이프라인

```
src/content/<category>/YYYY-MM-DD.md
  → glob loader + zod          (src/content.config.ts)
  → 3개 컬렉션 → 단일 Report    (src/lib/reports.ts)
  → 페이지·RSS 는 Report 만 소비
```

- 파일명 = `entry.id` = `Report.slug` = URL slug. 프론트매터 `date` 와 반드시 일치해야 합니다
  (`scripts/publish.py` 가 커밋 전에 검사).
- 페이지는 `getCollection` 을 직접 부르지 않고 `getAllReports()` / `getReportsByCategory()` 를 씁니다.
  draft 필터(`import.meta.env.DEV || !draft` — 개발 중에는 draft 도 보임)와 정렬이 여기서 한 번에 처리됩니다.
- 라우팅은 전부 `getStaticPaths` 기반 정적 생성. `build.format: 'directory'` 라서 모든 내부 링크에
  후행 슬래시를 붙입니다 (`/it-ai/2026-09-01/`).

### 카테고리 추가·변경 시 손대야 하는 곳

카테고리 ID 3개(`kr-daily`, `it-ai`, `global-ui-ux`)가 6개 파일에 하드코딩되어 있습니다.
하나라도 빠지면 빌드 실패 또는 조용한 스타일 누락으로 이어집니다.

| 파일 | 내용 |
| --- | --- |
| `src/lib/categories.ts` | `CATEGORY_IDS` + `CATEGORIES` (이름·설명·accent 색) |
| `src/content.config.ts` | `collections` 맵 |
| `src/lib/reports.ts` | `AnyEntry` 유니온 타입 |
| `src/styles/global.css` | `--cat-*` / `--cat-*-solid` / `--chip-*-bg` / `--chip-*-fg` 토큰, `.card--*` 규칙 |
| `scripts/publish.py` | `CATEGORIES` 집합 |
| `scripts/make-og.py` | `CARDS` 딕셔너리 → 실행해서 `public/og/<id>.png` 생성 |

### 날짜 — UTC 게터를 쓰는 이유

프론트매터의 `date: 2026-09-01` 은 **KST 달력 날짜**지만 `z.coerce.date()` 가 UTC 자정 Date 로 만듭니다.
그래서 `src/lib/reports.ts` 의 `toDateKey` / `formatDate` / `formatShortDate` 는 전부 `getUTCFullYear()`
계열을 씁니다. 여기에 `getFullYear()` 나 `toLocaleDateString()` 을 쓰면 실행 환경 타임존에 따라 하루가
밀립니다. 날짜 포맷 함수를 새로 만들 때도 UTC 게터를 유지하세요.

### 테마 토큰 — 3중 정의

`src/styles/global.css` 의 색 토큰은 세 블록에 **중복 정의**되어 있습니다.

1. `:root` — 라이트
2. `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }` — OS 다크
3. `:root[data-theme='dark']` — 수동 토글 다크

새 색 토큰은 세 곳 모두에 넣어야 합니다. 하나를 빠뜨리면 두 다크 경로 중 하나에서만 깨져서 눈에 잘
띄지 않습니다. 토글은 `localStorage['ai-report-theme']` 에 저장하고, `BaseLayout.astro` `<head>` 의
인라인 스크립트가 FOUC 를 막습니다. 다만 `<head>` 스크립트는 `dataset.theme` 만 세팅하므로,
토글 버튼의 `aria-label` 은 본문 끝 스크립트가 첫 렌더에 한 번 실제 상태와 맞춰줍니다
(마크업의 고정값은 OS 다크에서 틀립니다 — WCAG 4.1.2).

### `--cat-*` 와 `--cat-*-solid` 를 구분해서 쓰세요

카테고리 색이 두 벌입니다. 헷갈리면 WCAG 위반이 조용히 들어갑니다.

| 토큰 | 용도 | 흰 글자 대비 |
| --- | --- | --- |
| `--cat-*` | 테두리·좌측 바·불릿 같은 **장식** | 2.8~4.4:1 — 텍스트 배경으로 쓰면 안 됨 |
| `--cat-*-solid` | **흰 글자를 얹는 배경** (takeaway 번호, skip-link) | 4.7:1 |

리포트 상세는 `[slug].astro` 가 `--art-accent`(장식) 와 `--art-accent-solid`(흰 글자용) 를 함께
내려보냅니다. 새로 흰 글자를 얹는 자리를 만들면 반드시 `-solid` 쪽을 쓰세요.

본문 회색 `--ink-3` 도 4.5:1 을 맞춘 값입니다(라이트 `#6f6f69`, 다크 `#91918a`). 더 흐리게 바꾸면
13px 안팎의 메타 텍스트가 AA 아래로 떨어집니다.

### 제목 계층 — 건너뛰지 마세요

스크린리더 탐색과 SEO 가 함께 걸린 부분이라 페이지마다 `h1 → h2 → h3` 를 유지합니다.
카드 제목이 `h3`(`ReportCard.astro`) 로 고정이므로, 그 사이에 `h2` 가 반드시 있어야 합니다.

| 페이지 | `h2` 를 담당하는 것 |
| --- | --- |
| 홈 | `.section__head` 의 눈에 보이는 `h2` ("가장 최근 브리핑" 등) |
| 카테고리 목록 | `sr-only` `h2` — 디자인상 보이는 제목이 없어 넣은 것이니 지우지 마세요 |
| 아카이브 | 월 그룹 `<h2 class="day__date">` |
| 리포트 상세 | "오늘의 핵심" · 본문 `##` · "출처" |

홈의 날짜 그룹은 `<span class="day__date">` 인데, 이미 `h2` 아래에 있어 그대로 두었습니다.
아카이브만 최상위라 `h2` 입니다 — 같은 클래스지만 태그가 다른 건 의도된 것입니다.

`.empty` 안내 상자의 제목도 전부 `h2` 입니다 (`h3` 로 되돌리면 `h1 → h3` 로 건너뜁니다).
CSS 는 `.empty :is(h2, h3)` 로 잡습니다.

### 클라이언트 JS

프레임워크 아일랜드가 없습니다. 인터랙션은 `.astro` 안의 인라인 스크립트 4개가 전부입니다.
(`is:inline` 로 grep 하면 5건이 나오는데, 하나는 `BaseLayout` 의 JSON-LD 출력용 템플릿이라
인터랙션이 아닙니다.)

- 테마 부트스트랩(`<head>`) + 토글 핸들러 — `BaseLayout.astro`
- 아카이브 검색·필터 — `archive.astro`. 빌드 시 각 행의 `data-text` 속성에 검색 대상(제목·요약·핵심·
  태그·카테고리명·날짜)을 미리 넣고 DOM 을 숨김/표시합니다. 별도 인덱스 파일이 없습니다.
  본문 전문 검색이 필요해지면 Pagefind 로 교체하는 게 표준 경로입니다 (README 참고).
- 본문 가로 스크롤 처리 — `[category]/[slug].astro`. 넓은 표를 `.table-scroll` 로 감싸고
  (`tabindex` + `role="region"`), 넘치는 코드 블록에만 `tabindex` 를 붙입니다. 코드 블록 판정은
  폰트 스왑(`document.fonts.ready`)과 리사이즈 후 다시 합니다 — 첫 렌더 시점에는 폴백 폰트
  기준이라 넘치지 않는 블록까지 잡힙니다.

같은 성격의 기능을 추가할 때 프레임워크를 들이지 말고 이 패턴을 따르세요.

## SEO — 구조화 데이터와 OG 이미지

`src/lib/schema.ts` 가 schema.org JSON-LD 를 만들고 `BaseLayout` 의 `jsonLd` prop 으로 넘깁니다.
프론트매터에 이미 있는 값만 쓰므로 리포트를 쓸 때 추가로 채울 항목은 없습니다.

| 페이지 | 스키마 |
| --- | --- |
| 홈 | `WebSite` + `CollectionPage` |
| 카테고리 목록 · 아카이브 | `CollectionPage` + `BreadcrumbList` |
| 리포트 상세 | `BlogPosting` + `BreadcrumbList` |

`blogPostingSchema` 는 날짜에 `Report.dateKey`(YYYY-MM-DD)를 그대로 씁니다. 여기서 `Date` 를 다시
포맷하면 위의 UTC 규약이 깨져 하루가 밀립니다.

OG 이미지는 `public/og/{default,kr-daily,it-ai,global-ui-ux}.png` 4장이고 **저장소에 커밋된 정적
파일**입니다. 빌드 때 만들지 않습니다. `scripts/make-og.py` 가 헤드리스 Chrome + `sips`(macOS 기본
도구)로 1200×630 을 뽑습니다 — 이미지 라이브러리를 의존성에 넣지 않기 위한 선택입니다.

## 발행 흐름

```
예약 작업 → 마크다운 생성 → scripts/publish.py → git push (main) → Vercel 자동 배포
```

`python3 scripts/publish.py <category> <YYYY-MM-DD> <파일>`, 환경변수 `GH_TOKEN` · `GH_REPO`.

- **git 프로토콜을 씁니다** — GitHub REST API(`api.github.com/repos/*`)는 실행 환경 게이트웨이에서
  차단될 수 있어 신뢰할 수 없습니다. 이 결정을 되돌리지 마세요.
- 세 작업이 아침 중 각각 다른 시각에 **자기 파일 1개씩만** 커밋합니다. push 가 거부되면 rebase 후
  최대 3회 재시도 — 서로 다른 파일을 쓰므로 rebase 는 항상 깨끗하게 통과합니다.
- 커밋 전 검증: 카테고리 유효성, 날짜 형식, 필수 프론트매터(`title`/`date`/`summary`),
  **프론트매터 date 와 파일명 일치**, 내용이 같으면 빈 커밋 생략.

프론트매터 규격 전문은 `docs/AUTHORING.md`, 최초 세팅 절차는 `docs/SETUP.md`.

## 알아둘 점

- 경로 별칭 `~/*` → `src/*` (tsconfig.json, `astro/tsconfigs/strict` 확장).
- 사이트 주소는 `SITE_URL` 환경변수 → 없으면 `astro.config.mjs` 기본값. `public/robots.txt` 의 Sitemap
  주소는 하드코딩이라 도메인이 바뀌면 **두 곳을 같이** 고쳐야 합니다 (현재는 서로 맞아 있습니다).
- RSS 는 피드당 최근 60건까지 (`src/lib/feed.ts` 의 `FEED_LIMIT`). 전체 이력은 `/archive/` 에서 봅니다.
- `src/content/*/2026-08-31.md` 3개는 형식 안내용 샘플입니다. 첫 실제 리포트가 들어오면 삭제 대상.
- `vercel.json` 은 캐시 헤더만 정의합니다 — `/fonts/*` 1년 immutable, `/og/*` 1주.
  해시가 붙지 않는 경로라 명시가 필요합니다.
- `BaseLayout.astro` 의 폰트 `preload` 3개(서브셋 89·90·91)는 실제 빌드 산출물의 문자 분포를 재서
  고른 값입니다 — 한국어 UI 텍스트의 약 84%(79KB)를 담당합니다. 본문 언어나 카테고리 이름을 크게
  바꾸면 다시 재세요.
- `_to_delete/` 는 gitignore 된 잡동사니 디렉터리입니다 (README.md 사본 포함). 검색·탐색에서 제외하세요.
