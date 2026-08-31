# 설계 스펙: 무료 클라우드 자동 리포트 서비스 전환

작성일: 2026-08-31
상태: 확정 (구현 계획 작성 단계로 이행)
대상 저장소: `ai-report` (Astro 7 정적 사이트)

## 1. 목표와 배경

현재는 **로컬 Claude Code 예약작업**(맥에서 평일 아침 실행)이 세 갈래 리포트 마크다운을
생성해 `main` 에 커밋하고 Vercel 이 자동 배포한다. 약점은 "맥이 켜져 있어야 한다"는 것.

이 스펙은 그 생성 파이프라인을 **클라우드(GitHub Actions)로 이전**하여 로컬 의존을 제거하되,
**추가 현금 비용 0(무료)** 을 유지하는 것을 목표로 한다. 핵심은 생성을 **유료 Anthropic
API 가 아니라 기존 Claude Code 구독(OAuth 토큰)** 으로 돌리는 것이다.

비목표(YAGNI): 방문자용 온디맨드 생성, 결제/멀티테넌시, DB 도입, 다국어, 프론트엔드 전면
재구현(Nuxt/Next). 모두 이번 범위에서 제외한다.

## 2. 확정된 결정

| # | 결정 | 값 | 근거 |
| --- | --- | --- | --- |
| D1 | 스케줄 실행 | GitHub Actions cron | public repo 무료·무제한, git 네이티브, 로컬 의존 제거 |
| D2 | 생성 엔진 | Claude Code Action + 구독 OAuth 토큰 | 토큰당 과금 없음(구독 커버). 내장 WebSearch/WebFetch 로 리서치 |
| D3 | 프론트엔드 | Astro 7 유지 + Vue 3 아일랜드(점진) | 정적 콘텐츠엔 SSG 가 최적. 품질 바 이미 충족 |
| D4 | 저장/이력 | 파일(git), `content/<cat>/YYYY-MM-DD.md` | 현행 유지. 이력=백업. 500건+ 시 재검토 |
| D5 | 호스팅 | Vercel Hobby(무료) | push 시 자동 재배포. Pro 불필요 |
| D6 | 모바일 하한 | CSS 280–360px (Z Fold 커버) | 그 이하 2열 금지·가로 스크롤 0 |

전제(assumption): 사용자에게 **Claude Pro/Max 구독**이 있다(현재 로컬 Claude Code 사용 중이므로 충족).
구독이 없으면 이 스펙의 D2 는 성립하지 않는다(대안은 §10 참조).

## 3. 아키텍처

```
GitHub Actions (평일 아침, timezone: Asia/Seoul)
  └ generate.yml  (카테고리별 job: kr-daily / it-ai / global-ui-ux)
       1. checkout + setup-node(22.12+)
       2. KST 날짜 계산 → 파일 존재하면 skip (멱등)
       3. Claude Code Action 실행 (claude_code_oauth_token)
            - 카테고리 프롬프트로 리서치+마크다운 작성
            - src/content/<cat>/<date>.md 에 Write
       4. npm ci && npm run build   (zod 스키마 검증 게이트)
       5. git add/commit/push (GITHUB_TOKEN, contents:write)
       6. 실패 시 GitHub Issue 자동 생성
            ↓ push
Vercel Hobby  → dist/ 재빌드 → CDN 배포 → 사용자
```

**생성과 커밋의 책임 분리**: Claude Code 는 "리서치 + 파일 Write + 자체 검토"까지만 하고,
**커밋/푸시는 워크플로 스텝이 결정적으로 수행**한다(Claude 에게 git 을 맡기지 않는다). 이로써
재현성과 디버깅이 쉬워진다.

## 4. 컴포넌트와 인터페이스

### 4.1 생성 워크플로 `.github/workflows/generate.yml` (신규)

- 트리거: `schedule` 3개(카테고리별 시차) + `workflow_dispatch`(수동/백필용, `category`·`date` 입력).
- `permissions: contents: write`, `issues: write`.
- cron 은 **`timezone: Asia/Seoul`** 필드로 KST 직접 지정(2026-03+ 지원) — UTC 변환하지 않는다.
  - kr-daily `5 9 * * 1-5`, it-ai `10 9 * * 1-5`, global-ui-ux `15 9 * * 1-5` (모두 Asia/Seoul).
- 카테고리 매트릭스 대신 **잡 3개**(또는 입력 기반 단일 잡)로, 각 잡이 자기 파일 1개만 다룬다.
- 스텝 순서는 §3 의 1–6.
- 동시성: `concurrency: group=generate-<category>` 로 중복 실행 방지.

### 4.2 카테고리 프롬프트 `.github/prompts/<category>.md` (신규)

- 현행 `~/.claude/scheduled-tasks/ai-report-*/SKILL.md` 의 프롬프트를 저장소로 이관.
- 각 프롬프트는 (1) 역할·리서치 지침(신뢰 소스 우선), (2) **출력 마크다운 형식**을
  `src/content.config.ts` zod 스키마와 정확히 일치하도록 명시, (3) 파일 저장 경로 지시를 포함.
- Claude Code Action 에 `prompt`(또는 `direct_prompt`)로 전달. 프롬프트 안에서 오늘 KST 날짜와
  대상 파일 경로를 파라미터로 받는다.

### 4.3 콘텐츠 스키마 확장 `src/content.config.ts` (수정)

기존 필드 유지 + 자동생성 메타 추가(전부 optional, 하위호환):

```ts
schemaVersion: z.string().default('1.0'),
generatedAt: z.string().optional(),   // ISO 8601 KST, "2026-08-31T09:11:00+09:00"
generatedBy: z.string().optional(),   // "manual" | "claude-code"
sourceUrls: z.array(z.string().url()).optional(),
```

- `date` 는 현행대로 KST 달력 날짜, reports.ts 의 UTC 게터 규칙을 절대 바꾸지 않는다.
- 토큰/비용 필드는 **넣지 않는다**(구독 기반이라 토큰 과금 개념이 없음 — 과설계 방지).

### 4.4 기존 데이터 백필 `scripts/migrate-schema.mjs` (신규, 1회성)

- `src/content/**/*.md`(2026-08-31 3건 등)에 `schemaVersion`, `generatedBy: manual`,
  `generatedAt`(= 기존 date 09:00 KST) 추가. 실행 후 `npm run build` 로 검증.

### 4.5 프론트엔드(Phase 2, 선택) — Astro 유지 + Vue 아일랜드

- `@astrojs/vue` 등록.
- 아카이브 검색 → `src/components/ArchiveSearch.vue`(현행 data-text 필터 로직 이관).
- 테마 토글 → `useTheme` composable + `ThemeToggle.vue`, **aria-label 상태 동기화**(WCAG 4.1.2).
- 프레임워크 아일랜드는 **인터랙션 요소에만** 적용(SSG·번들 최소 원칙 유지).

### 4.6 품질 CI (Phase 2)

- `.github/workflows/a11y.yml`: PR 게이트로 axe-core + Pa11y(`WCAG2AA`) + Lighthouse CI(접근성 ≥ 0.9).
- 반응형은 자동화 대신 체크리스트 검증(280/360/375/768/1024px). 여력 시 시각회귀(BackstopJS)는 later.

## 5. 데이터 플로우와 멱등성

1. cron 발화 → 잡 시작 → `TZ=Asia/Seoul date +%F` 로 `<date>` 산출.
2. `src/content/<cat>/<date>.md` 존재 검사 → 있으면 **아무것도 하지 않고 성공 종료**(덮어쓰기 방지).
3. Claude Code 가 리서치→작성→해당 경로에 Write.
4. `npm run build` 통과해야만(=스키마 유효) 다음 단계 진행. 실패면 커밋하지 않고 잡 실패.
5. `git add <파일> && git commit && git push` (파일 1개, rebase 재시도 최대 3회 — 서로 다른 파일이라 충돌 없음).
6. Vercel 이 push 를 감지해 자동 재배포.

## 6. 오류 처리

- **생성/빌드 실패**: 커밋하지 않음. 잡 실패로 표시 + GitHub Issue 자동 생성(label `cron-failure`, 카테고리·날짜·로그 링크). 같은 날 중복 알림 억제.
- **푸시 충돌**: `git fetch && git rebase origin/main` 후 재시도(≤3회).
- **누락/지연**: Actions cron 은 지연·간헐 누락 가능 → `workflow_dispatch` 수동 백필 경로 제공. 멱등이라 재실행 안전.

## 7. 보안

- `CLAUDE_CODE_OAUTH_TOKEN` 은 **repo secret** 에만 저장(로그·클라이언트·URL 노출 절대 금지).
- 커밋/푸시는 워크플로 기본 `GITHUB_TOKEN`(권한 `contents:write`)로 동일 저장소에만.
- 생성은 서버(CI)에서만. 클라이언트 번들에 어떤 토큰도 포함되지 않음.
- web 리서치 결과를 콘텐츠로 넣을 때의 오정보/프롬프트 인젝션 리스크 → 프롬프트에서 출처 URL 병기 강제, 신뢰 도메인 우선.

## 8. 검증(테스트) 전략

프로젝트에 테스트 스위트가 없으므로 게이트는:
- **`npm run build`**(zod 콘텐츠 스키마) — 생성물 형식의 1차 게이트(CI 잡 내).
- **`npm run check`** — `.astro`/`.ts` 수정 시 타입까지.
- Phase 2: axe/Pa11y/Lighthouse CI(접근성·성능), 반응형 수동 체크리스트.
- 생성 파이프라인 자체는 `workflow_dispatch` 로 과거 날짜 백필 실행해 e2e 검증.

## 9. 리스크와 완화

| 리스크 | 완화 |
| --- | --- |
| 구독 usage 한도 소모 | 하루 3건(짧은 리포트)로 경량. 초과 징후 시 빈도/길이 조정 |
| 스케줄 60일 무활동 자동 비활성화 | 매일 커밋되어 활성 유지. 모니터로 확인 |
| cron 지연(부하 시 15분+) | 아침 리포트엔 무방(현행도 jitter) |
| Actions 에서 Claude Code 커밋 신뢰성 | 커밋을 워크플로 스텝이 결정적으로 수행(§3) |
| 날짜 하루 밀림(타임존) | KST 산출 강제(`TZ=Asia/Seoul`), reports.ts UTC 게터 규칙 유지 |
| SEO 날짜 형식 오류 | `toIsoKst()` 단일 사용 유지 |

## 10. 대안(참고, 이번 범위 밖)

- 구독이 전혀 없고 진짜 $0 필요 시: 생성만 무료 티어 LLM(Gemini Flash) 또는 로컬 Ollama.
  현금 0 이나 비-Claude·품질↓. 채택 시 별도 스펙 필요.
- 유료 감수 가능 시: Anthropic API + `web_search_20260209` + Vercel Cron/Managed Agents. 이번엔 미채택.

## 11. 범위 분할(Phase)

- **Phase 1 (MVP)**: §4.1–4.4 + §5–8 의 생성·저장·배포·오류 처리. 기존 Astro UI 그대로.
- **Phase 2 (품질·프론트)**: §4.5–4.6. Vue 아일랜드 + WCAG/성능 CI + 반응형 하한.
- **Phase 3 (later)**: Pagefind 전문검색, (필요 시)DB, React 학습용 격리 라우트.

구현은 Phase 1 부터. 상세 태스크는 별도 구현 계획 문서에서 원자 단위로 분해한다.
