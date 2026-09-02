# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트

Astro 7 정적 사이트. 평일 아침 GitHub Actions 가 Claude Code(구독 OAuth)로 생성한 세 갈래 브리핑
마크다운을 GitHub `main` 에 커밋하면 Vercel 이 자동 재배포하는 아카이브입니다. 런타임 의존성은 3개
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

CI 게이트가 하나 더 있습니다 — PR 을 열면 `.github/workflows/quality.yml` 이 접근성·성능을 검사합니다
(pa11y-ci `WCAG2AA` + Lighthouse CI, accessibility ≥ 0.9 는 실패 조건, perf·SEO 는 advisory). 도구는 CI 에서만
`npx` 로 설치해 package.json 을 건드리지 않습니다. 콘텐츠는 `main` 에 직접 push 되므로, 이 게이트는
템플릿·스타일을 바꾸는 사람 dev 의 PR 에서만 돕니다. **pa11y 는 라이트 모드만 렌더**하므로, 같은 잡의
`scripts/contrast-check.py` 가 카테고리 색 토큰을 **라이트+다크 3블록** 전부 계산해 대비 임계를 강제합니다
(`--cat-*-solid` vs 흰글자 ≥ 4.7, `--chip-*-fg/bg` ≥ 4.5 — 다크 회귀 방지). 의존성 없이 `global.css` 만 읽습니다.

자동 생성 파이프라인에는 게이트가 하나 더 있습니다 — `generate.yml` 이 빌드(zod) 통과 뒤 커밋 전에
`scripts/quality-check.py <파일>` 을 돌립니다. zod 가 최소 개수를 강제하지 않는 **오늘의 핵심 ≥ 3·출처 ≥ 3·
본문 길이·title/summary** 를 검사해, 생성이 사실상 실패한 리포트(빈 본문·출처 없음 등)의 커밋을 막습니다
(실패 시 `cron-failure` 이슈). 직전 리포트와 본문이 동일하면 경고만 합니다.

## 아키텍처

### 콘텐츠 파이프라인

```
src/content/<category>/YYYY-MM-DD.md
  → glob loader + zod          (src/content.config.ts)
  → 3개 컬렉션 → 단일 Report    (src/lib/reports.ts)
  → 페이지·RSS 는 Report 만 소비
```

- 파일명 = `entry.id` = `Report.slug` = URL slug. 프론트매터 `date` 와 반드시 일치해야 합니다
  (생성 워크플로의 빌드 게이트와 `scripts/publish.py` 가 커밋 전에 검사).
- 프론트매터엔 자동생성 메타(`schemaVersion`/`generatedAt`/`generatedBy`/`sourceUrls`)가 optional 로 있습니다
  — 값이 없어도 빌드는 통과(하위호환). 규격은 `src/content.config.ts`.
- 페이지는 `getCollection` 을 직접 부르지 않고 `getAllReports()` / `getReportsByCategory()` 를 씁니다.
  draft 필터(`import.meta.env.DEV || !draft` — 개발 중에는 draft 도 보임)와 정렬이 여기서 한 번에 처리됩니다.
- 라우팅은 전부 `getStaticPaths` 기반 정적 생성. `build.format: 'directory'` 라서 모든 내부 링크에
  후행 슬래시를 붙입니다 (`/it-ai/2026-09-01/`).

### 카테고리 추가·변경 시 손대야 하는 곳

카테고리 ID(현재 10개: `kr-daily`, `it-ai`, `global-ui-ux`, `electronics`, `health`, `food-travel`,
`gaming`, `education`, `finance`, `mobility`)가 아래 지점에 하드코딩되어 있습니다.
하나라도 빠지면 빌드 실패, 조용한 스타일 누락, 또는 GNB·자동 생성에서 누락으로 이어집니다.

| 파일 | 내용 |
| --- | --- |
| `src/lib/categories.ts` | `CATEGORY_IDS` + `CATEGORIES` (이름·설명·accent 색) + **`CATEGORY_GROUPS`**(GNB 그룹 배정 — 빠지면 상단 네비에서 안 보임) |
| `src/content.config.ts` | `collections` 맵 |
| `src/lib/reports.ts` | `AnyEntry` 유니온 타입 |
| `src/styles/global.css` | `--cat-*` / `--cat-*-solid` / `--chip-*-bg` / `--chip-*-fg` 토큰, `.card--*` · `.chip--*` 규칙 |
| `.github/prompts/<id>.md` | 생성 지침(`# 역할`·`# 리서치` 도메인별, `# 출력`·`# 금지` 는 바이트 동일) |
| `.github/workflows/generate.yml` | cron 1줄 + schedule→category `case` 매핑 + 검증 whitelist + `workflow_dispatch` 설명 (cron·case 문자열 바이트 동일) |
| `scripts/publish.py` | `CATEGORIES` 집합 (수동 발행용) |
| `scripts/make-og.py` | `CARDS` 딕셔너리 → 실행해서 `public/og/<id>.png` 생성 |

### 날짜 — UTC 게터를 쓰는 이유

프론트매터의 `date: 2026-09-01` 은 **KST 달력 날짜**지만 `z.coerce.date()` 가 UTC 자정 Date 로 만듭니다.
그래서 `src/lib/reports.ts` 의 `toDateKey` / `formatDate` / `formatShortDate` / `toIsoKst` 는 전부
`getUTCFullYear()` 계열을 씁니다. 여기에 `getFullYear()` 나 `toLocaleDateString()` 을 쓰면 실행 환경 타임존에 따라 하루가
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
| 카테고리 목록 · 태그(`/tag/<slug>/`) | `sr-only` `h2` — 디자인상 보이는 제목이 없어 넣은 것이니 지우지 마세요 |
| 아카이브 | 월 그룹 `<h2 class="day__date">` |
| 리포트 상세 | "오늘의 핵심" · 본문 `##` · "출처" · "관련 리포트" |

홈의 날짜 그룹은 `<span class="day__date">` 인데, 이미 `h2` 아래에 있어 그대로 두었습니다.
아카이브만 최상위라 `h2` 입니다 — 같은 클래스지만 태그가 다른 건 의도된 것입니다.

`.empty` 안내 상자의 제목도 전부 `h2` 입니다 (`h3` 로 되돌리면 `h1 → h3` 로 건너뜁니다).
CSS 는 `.empty :is(h2, h3)` 로 잡습니다.

### 클라이언트 JS

프레임워크 아일랜드가 없습니다. 인터랙션은 `.astro` 안의 인라인 스크립트 5개가 전부입니다.
(`is:inline` 로 grep 하면 7건이 나오는데, 하나는 `BaseLayout` 의 JSON-LD 출력용 템플릿이고
하나는 `BaseLayout` 의 서비스워커 등록(PWA, 인터랙션 아님)입니다.)

- 테마 부트스트랩(`<head>`) + 토글 핸들러 — `BaseLayout.astro`
- GNB 그룹 드롭다운 — `Header.astro`. 카테고리 10개를 `CATEGORY_GROUPS`(3그룹)로 묶어 네이티브
  `<details>/<summary>` 로 렌더합니다. 토글·키보드·aria 는 브라우저가 처리하고, 인라인 스크립트는
  보강만 합니다 — 한 그룹을 열면 나머지 닫기, Escape(포커스 복귀), 바깥 클릭 닫기. 프레임워크 없이
  접근 가능한 드롭다운을 만드는 표준 패턴이니 메뉴류를 추가할 때 이 방식을 따르세요. 데스크톱은
  우측 정렬 컴팩트 패널, 모바일(≤720px)은 nav 전체 폭 패널(`.nav-group { position: static }`)입니다.
- 아카이브 검색·필터 — `archive.astro`. **본문 전문 검색은 Pagefind**로 합니다. `data-pagefind-body`
  를 리포트 상세 `<article>` 에만 달아 **리포트 페이지만 색인**(홈·목록·아카이브 제외)하고, 목차·구독
  배너·페이저·고지는 `data-pagefind-ignore` 로 뺍니다. 검색 스크립트는 `pagefind.search(q)` 로 매칭
  리포트 URL 집합을 받아 **기존 행(row)을 그 집합으로 필터**합니다(기존 UI·카테고리 필터 재사용).
  `/pagefind/` 는 **배포 시에만 생성**됩니다 — `vercel.json` 의 `buildCommand` 가 `npm run build` 뒤에
  `npx pagefind --site dist` 를 돌립니다(실패해도 배포는 진행, 검색은 폴백). 그래서 로컬 `npm run build`
  와 CI 게이트엔 `/pagefind/` 가 없고, 이때 검색은 각 행의 `data-text`(제목·요약·핵심·태그·카테고리·날짜)
  **클라이언트 필터로 폴백**합니다. 로컬에서 전문 검색을 테스트하려면 `npm run build && npx pagefind
  --site dist && npm run preview`.
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
| 카테고리 목록 · 아카이브 · 태그 · 주간(`/weekly/`) | `CollectionPage` + `BreadcrumbList` |
| 리포트 상세 | `BlogPosting` + `BreadcrumbList` |

날짜는 `toIsoKst()`(reports.ts) 한 곳에서만 만듭니다 — `2026-08-31T00:00:00+09:00`.
JSON-LD 의 `datePublished`/`dateModified` 와 `<meta property="article:published_time">` 이
같은 값을 써야 하므로 헬퍼를 공유합니다. 날짜만 있는 `2026-08-31` 은 Google Rich Results Test 가
"datetime 값이 잘못됨 / 시간대 누락" 으로 지적하고, `toISOString()` 은 UTC 자정을 내보내
KST 달력 날짜와 9시간 어긋납니다. 둘 다 쓰지 마세요.

OG 이미지는 `public/og/{default,kr-daily,it-ai,global-ui-ux}.png` 4장이고 **저장소에 커밋된 정적
파일**입니다. 빌드 때 만들지 않습니다. `scripts/make-og.py` 가 헤드리스 Chrome + `sips`(macOS 기본
도구)로 1200×630 을 뽑습니다 — 이미지 라이브러리를 의존성에 넣지 않기 위한 선택입니다.

`public/robots.txt` 는 주요 AI 크롤러(GPTBot·ClaudeBot·anthropic-ai·CCBot·Google-Extended·PerplexityBot 등)를
명시적으로 `Allow` 합니다(공개 무료 아카이브). 리포트 상세 하단엔 "AI(Claude) 자동 생성" 고지
`<footer class="ai-disclaimer">`(`--ink-3`, 출처가 있으면 `#sources` 앵커 링크)가 있습니다.

## 발행 흐름

```
GitHub Actions cron → Claude Code(구독 OAuth)로 리서치·마크다운 작성 → npm run build → git push (main) → Vercel 자동 배포
```

평일 아침 `.github/workflows/generate.yml` 이 카테고리별로 **Claude Code Action**(`claude_code_oauth_token`)을
실행해 리포트를 생성합니다. 구독 사용이라 토큰당 API 과금이 없고, 클라우드에서 돌아 맥 의존이 없습니다.

| 스케줄 (cron · UTC) | KST | 카테고리 |
| --- | --- | --- |
| `5 0 * * 1-5` | 09:05 | kr-daily |
| `10 0 * * 1-5` | 09:10 | it-ai |
| `15 0 * * 1-5` | 09:15 | global-ui-ux |

cron 은 UTC(`5 0` = 00:05 UTC = 09:05 KST). 리포트 날짜는 잡 안에서 `TZ=Asia/Seoul date +%F` 로 KST 산출합니다.
카테고리별 프롬프트는 `.github/prompts/<category>.md`.

- 생성은 Claude 가 파일 Write 까지만 하고, **커밋/푸시는 워크플로 스텝이 결정적으로** 합니다(git 을 Claude 에 맡기지 않음).
- 검증 게이트는 `npm run build`(zod). 통과해야만 커밋. 같은 날짜 파일이 있으면 skip(멱등). push 충돌 시 rebase 재시도 3회.
- 실패 시 `cron-failure` 라벨 GitHub Issue 를 자동 생성합니다.

**가동 스위치 (현재 비활성)** — 워크플로는 `disabled_manually` 상태입니다. 켜려면(사용자 자격증명 필요):
`github.com/apps/claude` 설치 → `claude setup-token` → repo secret `CLAUDE_CODE_OAUTH_TOKEN` 등록 →
`gh workflow enable "Generate Reports"`. secret 없이 켜면 평일 아침 인증 실패로 이슈가 쌓여 일부러 꺼둔 것입니다.
설계·계획 전문은 `docs/superpowers/specs|plans/2026-08-31-free-claude-report-service*`.

로컬 예약작업(`~/.claude/scheduled-tasks/ai-report-*`)은 fallback 으로 보존합니다(프롬프트는 각 `SKILL.md`).

### scripts/publish.py — 수동 발행용

파이프라인에서는 더 이상 쓰지 않지만, 다른 환경(클라우드 등)에서 발행하거나 손으로 올릴 때
쓰는 도구로 남아 있습니다. `python3 scripts/publish.py <category> <YYYY-MM-DD> <파일>`,
환경변수 `GH_TOKEN` · `GH_REPO` 필요.

- **git 프로토콜을 씁니다** — GitHub REST API(`api.github.com/repos/*`)는 실행 환경 게이트웨이에서
  차단될 수 있어 신뢰할 수 없습니다. 이 결정을 되돌리지 마세요.
- 커밋 전 검증: 카테고리 유효성, 날짜 형식, 필수 프론트매터(`title`/`date`/`summary`),
  **프론트매터 date 와 파일명 일치**, 내용이 같으면 빈 커밋 생략.

프론트매터 규격 전문은 `docs/AUTHORING.md`, 최초 세팅 절차는 `docs/SETUP.md`.

## 알아둘 점

- 경로 별칭 `~/*` → `src/*` (tsconfig.json, `astro/tsconfigs/strict` 확장).
- 사이트 주소는 `SITE_URL` 환경변수 → 없으면 `astro.config.mjs` 기본값
  (현재 `https://ai-report-navy.vercel.app` — Vercel 의 공개 프로덕션 별칭입니다).
  이 값 하나가 canonical · og:image · JSON-LD · sitemap · RSS 의 절대 URL 을 전부 만듭니다.
  도메인이 바뀌면 하드코딩된 **세 곳을 같이** 고쳐야 합니다.

  | 위치 | 내용 |
  | --- | --- |
  | `astro.config.mjs` | `SITE` 기본값 |
  | `public/robots.txt` | `Sitemap:` 주소 |
  | `scripts/make-og.py` | OG 이미지 하단 문구 → 고친 뒤 스크립트를 다시 실행 |

  `ai-report-git-main-*.vercel.app`(브랜치 별칭)은 Vercel Deployment Protection 이 걸려 있어
  로그인 없이는 열리지 않습니다. 공개 주소로 쓰지 마세요.
- RSS 는 피드당 최근 60건까지 (`src/lib/feed.ts` 의 `FEED_LIMIT`). 전체 이력은 `/archive/` 에서 봅니다.
- 샘플 파일은 2026-08-31 자 실제 리포트로 대체됐습니다. 콘텐츠 디렉터리에 자리표시자가 없습니다.
- `vercel.json` 은 캐시 헤더만 정의합니다 — `/fonts/*` 1년 immutable, `/og/*` 1주.
  해시가 붙지 않는 경로라 명시가 필요합니다.
- `BaseLayout.astro` 의 폰트 `preload` 3개(서브셋 89·90·91)는 실제 빌드 산출물의 문자 분포를 재서
  고른 값입니다 — 한국어 UI 텍스트의 약 84%(79KB)를 담당합니다. 본문 언어나 카테고리 이름을 크게
  바꾸면 다시 재세요.
- 모바일 좌우 여백은 `.wrap` 의 `max(20px, env(safe-area-inset-*))`(≤560px) + `<meta viewport ... viewport-fit=cover>`.
  리포트 상세 `.article` 은 `padding-block` 만 지정해 `.wrap` 의 좌우 여백을 상속합니다 — `padding: X 0 Y` 로
  되돌리면 상세 콘텐츠가 모바일에서 화면 끝에 붙습니다.
- **PWA(설치형 앱)** — 빌드 플러그인 없이 손으로 만든 정적 자산입니다. `public/manifest.webmanifest`
  (standalone·아이콘 192/512 any-maskable·theme-color), `public/sw.js`(서비스워커 — 해시 정적 자산은
  캐시 우선, 문서는 네트워크 우선+오프라인 캐시 폴백), `public/icons/{192,512,180}.png`. 아이콘은
  `scripts/make-icons.py`(Chrome+sips, make-og 방식)로 생성 — 브랜드 마크가 바뀔 때만 재실행.
  `BaseLayout` `<head>` 가 manifest·apple-touch-icon·theme-color(라이트/다크)·apple 메타를 걸고,
  본문 끝 인라인 스크립트가 SW 를 등록합니다(실패해도 사이트 정상 — 진행적 향상). SW 는 HTTPS/localhost
  에서만 등록되고, 자동화·임베디드 브라우저에선 등록이 막힐 수 있습니다(실기기·프로덕션에선 정상).
  SW 캐시 스키마를 바꾸면 `sw.js` 의 `CACHE = 'ai-report-vN'` 버전을 올려 옛 캐시를 무효화하세요.
- `_to_delete/` 는 gitignore 된 잡동사니 디렉터리입니다 (README.md 사본 포함). 검색·탐색에서 제외하세요.
