# AI Report

매일 자동으로 생성되는 **여덟 개 주제** 브리핑을 한곳에 쌓는 아카이브 사이트입니다.

| 카테고리 | 경로 | 내용 | 발행 |
| --- | --- | --- | --- |
| 한국 데일리 브리핑 | `/kr-daily/` | 증시·IT 섹터·정치·날씨 | 평일 |
| IT·AI 심층 스크랩 | `/it-ai/` | 프론트엔드·AI·빅테크·인프라 | 평일 |
| 글로벌 UI·UX 브리핑 | `/global-ui-ux/` | 디자인 트렌드·UX 사례·리서치·구현 | 평일 |
| 전자기기 | `/electronics/` | 가전·모바일·반도체·IT기기 신제품·리뷰 | 평일 |
| 맛집·여행 | `/food-travel/` | 화제의 맛집·여행지 트렌드 | **매일** |
| 게임 | `/gaming/` | 온라인·모바일·콘솔·이스포츠·업계 | 평일 |
| 경제·재테크 | `/finance/` | 금리·부동산·주식·코인 | 평일(장 마감 후) |
| 자동차·모빌리티 | `/mobility/` | 전기차·신차·자율주행 산업 | 평일 |

GNB 는 이 8개를 **3그룹**(시사·경제 · 기술 · 컬처·라이프)으로 묶어 보여줍니다.

## 동작 방식

```
GitHub Actions cron (매일 · 2-window catch-up)
        │
        ├─ Claude Code(구독 OAuth)로 웹 리서치 → 마크다운 작성
        ▼
   npm run build (콘텐츠 스키마 검증 게이트)
        │
        ├─ 통과 → git commit → push → GitHub 저장소 (main)
        │                              │ 자동 트리거
        │                              ▼
        │                      Vercel 빌드 & 배포 (30초~1분)
        │
        └─ 실패 → cron-failure 이슈 생성
```

**GitHub Actions 파이프라인**입니다. `.github/workflows/generate.yml` 이 클라우드에서 Claude Code
Action(`claude_code_oauth_token`)을 실행해 리포트를 생성합니다. 구독 사용이라 토큰당 API 과금이
없고, 맥 의존 없이 클라우드에서 돕니다.

**2-window catch-up 스케줄** — 두 개의 창으로 나뉘고, 한 발화 = 그 창의 오늘 due 중 아직 파일이
없는 첫 카테고리 하나를 생성(멱등)합니다. GitHub 예약은 best-effort 라 지연·드롭되므로 창 안에서
반복 시도해 누락을 메웁니다.

| 창 | cron (UTC) | KST | 대상 |
| --- | --- | --- | --- |
| 아침 | `10,30,50 17-20 * * *` (10회) | 02:10~05:10 · 매일 | finance 제외 전부 (07시 기상 전 도착 목표) |
| 오후 | `35 6`·`5 7`·`35 7`·`5 8 * * 1-5` (4회) | 15:35~17:05 · 평일 | finance 만 (장 마감 후 수치) |

요일별 빈도는 워크플로의 `Resolve` 스텝이 KST 요일로 계산합니다 — 평일(월~금): kr-daily·it-ai·finance·
global-ui-ux·electronics·gaming·mobility, 매일(주말 포함): food-travel. cron↔카테고리 1:1 매핑은 없습니다.

Claude 는 Write 까지만 하고, **커밋/푸시는 워크플로 스텝이 결정적으로** 수행합니다 (git 을
Claude 에 맡기지 않음). 검증 게이트는 `npm run build` (zod 스키마). 같은 날짜 파일이 있으면
skip(멱등). 푸시 충돌 시 rebase 후 최대 3회 재시도합니다. 실패 시 `cron-failure` 라벨 이슈를
자동 생성합니다.

**가동 스위치 (현재 비활성)** — 워크플로는 `disabled_manually` 상태입니다. 켜려면(사용자
자격증명 필요): `github.com/apps/claude` 설치 → `claude setup-token` → repo secret
`CLAUDE_CODE_OAUTH_TOKEN` 등록 → `gh workflow enable "Generate Reports"`.

로컬 예약작업(`~/.claude/scheduled-tasks/ai-report-*`)과 `scripts/publish.py`(git 프로토콜)는
fallback/수동 경로로 남아 있습니다.

## 기술 스택

- **Astro 7** — 정적 사이트 생성, 콘텐츠 컬렉션
- **런타임 의존성 3개** (astro, @astrojs/rss, @astrojs/sitemap) — 프레임워크 런타임 없음,
  클라이언트 JS 번들 0바이트 (인터랙션은 인라인 스크립트 5개가 전부)
- **개발 의존성 2개** (@astrojs/check, typescript) — `npm run check` 전용, 빌드 산출물과 무관
- **Vercel** — GitHub 연동 자동 배포

## 로컬 개발

**Node 22.12.0 이상**이 필요합니다 (`.nvmrc` 에 고정). Node 20 에서는 빌드가 시작조차 하지 않습니다.

```bash
nvm use          # .nvmrc 의 22.12.0
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 로 정적 빌드
npm run preview  # 빌드 결과 미리보기
npm run check    # 타입·콘텐츠 스키마 검사
```

## 디렉터리 구조

```
src/
├── content/                 리포트 마크다운 (8개 카테고리 디렉터리, 여기에 쌓입니다)
│   ├── kr-daily/YYYY-MM-DD.md
│   ├── it-ai/YYYY-MM-DD.md
│   └── … (global-ui-ux·electronics·food-travel·gaming·finance·mobility)
├── content.config.ts        프론트매터 스키마 (zod)
├── lib/
│   ├── categories.ts        카테고리 정의 · 색상 토큰
│   ├── reports.ts           로딩 · 정렬 · 그룹핑 헬퍼
│   ├── feed.ts              RSS 본문 생성 · FEED_LIMIT
│   └── schema.ts            schema.org JSON-LD 생성
├── layouts/BaseLayout.astro
├── components/              Header · Footer · ReportCard
├── pages/
│   ├── index.astro          통합 최신 피드
│   ├── archive.astro        전체 아카이브 + 검색 + 필터
│   ├── 404.astro
│   ├── [category]/          카테고리 목록 · 리포트 상세
│   ├── rss.xml.ts           전체 RSS
│   └── rss/[category].xml.ts 카테고리별 RSS
└── styles/global.css        디자인 토큰 + 전체 스타일
public/
├── fonts/pretendard/        자체 호스팅 Pretendard Variable (SIL OFL 1.1)
├── og/                      소셜 미리보기 이미지 (default + 8개 카테고리, 커밋된 정적 파일)
└── robots.txt               Sitemap 주소가 하드코딩되어 있습니다
scripts/publish.py           수동/폴백 발행 스크립트
scripts/make-og.py           public/og/*.png 재생성 (카테고리·브랜드 변경 시에만)
vercel.json                  폰트·OG 이미지 캐시 헤더
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

## RSS

| 피드 | 주소 |
| --- | --- |
| 전체 | `/rss.xml` |
| 카테고리별 (8개) | `/rss/<category>.xml` — kr-daily · it-ai · global-ui-ux · electronics · food-travel · gaming · finance · mobility |

각 페이지 `<head>` 에 `<link rel="alternate">` 로 걸려 있어 리더에 사이트 주소만 넣어도 자동으로
잡힙니다. 카테고리 페이지에서는 해당 카테고리 피드가 먼저 노출됩니다.

**갱신 시점** — 피드는 정적 파일이라 *빌드될 때* 다시 만들어집니다. 워크플로는 **카테고리별로 독립적으로
커밋**합니다(한 발화 = 한 카테고리). 여러 카테고리를 모아 한 번에 올리지 않습니다.

아침 창(KST 02:10~05:10)이 finance 제외 카테고리를 순차로 채우고, 오후 창(15:35~17:05)이 finance 를
올립니다. 각 커밋이 Vercel 빌드를 따로 트리거하므로 사이트는 그 시간대에 걸쳐 순차적으로 채워집니다
(GitHub 예약 지연이 있으면 실제 도착은 더 늦어질 수 있습니다).

```
kr-daily 커밋   → 빌드 → 1~2분 후 반영
it-ai 커밋      → 빌드 → 1~2분 후 반영
…              (그날 due 카테고리 순차)
finance 커밋    → (오후 창) 빌드 → 1~2분 후 반영
       ↓
       리더가 다음 폴링에서 수집 (리더별 15분~1시간)
```

커밋 후 **1~2분이면 서버에 반영**되고, 구독자가 실제로 보는 시점은 각자 리더의 폴링 주기에
달려 있습니다. 채널에 `<ttl>60</ttl>` 로 한 시간 간격을 권장해 두었습니다.

**독립 커밋 이유** — 한 발화가 실패해도 나머지는 그대로 올라갑니다. 대신 그 시간대 중에 사이트를 보면
아직 안 올라온 리포트가 있을 수 있습니다.

**항목 수** — 피드당 최근 60건까지만 싣습니다 (`src/lib/feed.ts` 의 `FEED_LIMIT`).
무제한이면 1년 뒤 XML 이 수 MB 가 되는데, 리더는 이미 수집한 항목을 자체 보관하므로
이력이 끊기지 않습니다. 전체 이력은 `/archive/` 에서 봅니다.

## 반응형

| 구간 | 레이아웃 |
| --- | --- |
| 941px~ | 카드 3열, 헤더 1행 + 전체 라벨 |
| 861~940px | 카드 2열, 헤더 1행 + 전체 라벨 |
| 721~860px | 카드 2열, 헤더 1행 + 축약 라벨 (한국 / IT·AI / UI·UX) |
| 641~720px | 카드 2열, 헤더 2행 (브랜드+토글 / 메뉴 스크롤 스트립) |
| ~640px | 카드 1열, 헤더 2행 |

표의 카드 열 수는 홈의 고정 3열 그리드(`.grid--3`) 기준입니다. 카테고리 목록은
`auto-fill minmax(300px, 1fr)` 이라 3열이 되는 지점이 976px 로, 홈보다 조금 늦습니다
(941~975px 구간에서만 홈 3열 / 카테고리 목록 2열).

320~1920px 22개 폭 × 4개 페이지에서 가로 스크롤 0건, 터치 타깃은 전부 WCAG 2.2 SC 2.5.8(24×24)
이상을 충족합니다. 본문 측정폭은 데스크톱에서 한 줄 약 43자로, 한글 가독 범위(40~50자) 안입니다.

## 알아둘 점

- **검색 범위** — 아카이브 검색은 제목·요약·핵심·태그·카테고리명·날짜를 대상으로 합니다. 본문 전문 검색이
  필요해지면 [Pagefind](https://pagefind.app/) 를 붙이는 게 표준 경로입니다
  (`npm i -D pagefind`, 빌드 스크립트를 `astro build && pagefind --site dist` 로 변경).
- **폰트** — Pretendard **Variable** 을 `public/fonts/pretendard/` 에 자체 호스팅합니다
  (SIL OFL 1.1, `font-weight: 45 920` 가변 축). 외부 CDN 의존이 없어 사내망에서도 동일하게
  렌더되고, dynamic-subset 이라 브라우저가 실제로 쓰이는 유니코드 범위만 내려받습니다.
  서브셋 3개(89·90·91)는 `<head>` 에서 preload 합니다 — 한국어 UI 텍스트의 약 84%(79KB)를
  담당한다는 것을 빌드 산출물의 문자 분포로 재서 고른 값입니다. 폰트를 빼려면
  `BaseLayout.astro` 의 **stylesheet 링크와 preload 3줄을 함께** 지우세요 (preload 만 남으면
  쓰이지 않는 파일을 계속 내려받습니다). 시스템 한글 폰트로 폴백합니다.
- **사이트 주소** — `astro.config.mjs` 가 환경변수 `SITE_URL` 을 읽고, 없으면 기본값
  `https://ai-report-navy.vercel.app` 을 씁니다. 도메인을 바꿀 때는 **세 곳을 같이** 고쳐야 합니다:
  `astro.config.mjs` (SITE 기본값) · `public/robots.txt` (Sitemap 주소) · `scripts/make-og.py` (OG 이미지 하단 문구).
- **소셜 미리보기** — 모든 페이지에 `og:image` 가 붙습니다. 카테고리별로 다른 이미지를 쓰고,
  카테고리·브랜드 색을 바꿨다면 `python3 scripts/make-og.py` 로 다시 뽑으세요
  (헤드리스 Chrome + macOS `sips` 만 씁니다 — 이미지 라이브러리 의존성 없음).
- **품질 게이트** — PR 을 열면 `.github/workflows/quality.yml` 이 접근성(pa11y-ci WCAG2AA, ≥0.9)과
  성능(Lighthouse CI)을 검사합니다. 콘텐츠는 `main` 에 직접 push 되므로 이 게이트는 템플릿·스타일 변경자의 dev PR 에서만 돕니다.
- **로봇·AI 크롤러** — `public/robots.txt` 는 주요 AI 크롤러(GPTBot·ClaudeBot·anthropic-ai·CCBot·Google-Extended·PerplexityBot 등)를
  명시적으로 `Allow` 합니다(공개 무료 아카이브). 리포트 상세 하단에는 "AI(Claude) 자동 생성" 고지(`<footer class="ai-disclaimer">`, `--ink-3`)가 있습니다.
- **구조화 데이터** — 리포트 상세에 `BlogPosting`, 목록에 `CollectionPage`, 모든 하위 페이지에
  `BreadcrumbList` 를 JSON-LD 로 넣습니다 (`src/lib/schema.ts`). 프론트매터 값만 쓰므로 리포트를
  쓸 때 따로 채울 항목은 없습니다.
- **접근성** — 본문·메타 텍스트와 흰 글자를 얹는 배경색이 전부 WCAG AA(4.5:1) 이상입니다.
  카테고리 색은 장식용 `--cat-*` 와 흰 글자용 `--cat-*-solid` 두 벌이니 섞어 쓰지 마세요.
- **날짜 처리** — 프론트매터의 `date` 는 KST 달력 날짜입니다. 렌더링 시 UTC 필드를 그대로 읽어
  타임존에 따라 하루가 밀리는 문제를 막습니다.
