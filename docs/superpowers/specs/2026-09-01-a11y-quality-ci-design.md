# 설계 스펙: 접근성·품질 CI 게이트 (Phase 2 – A)

작성일: 2026-09-01
상태: 확정 (구현 계획 작성 단계로 이행)
상위: `docs/superpowers/specs/2026-08-31-free-claude-report-service-design.md` Phase 2 의 첫 서브프로젝트

## 1. 목표와 배경

템플릿·스타일 변경 시 접근성·성능 회귀를 **PR에서 자동 차단**하는 게이트를 도입한다.
런타임 소스(페이지/컴포넌트)는 바꾸지 않고, CI 워크플로 + 설정 파일만 추가한다.

이 사이트는 이미 의도적으로 접근성을 맞춰둔 상태(색 대비 4.5:1, `h1→h2→h3` 계층, aria-label,
스킵링크, `--cat-*-solid` 대비 등 — CLAUDE.md 참고)라, 게이트는 대부분 통과할 것으로 본다.
목적은 "지금 상태를 측정해 베이스라인으로 고정하고, 이후 변경의 회귀를 막는 것"이다.

비목표(YAGNI): 시각 회귀 테스트(Percy/BackstopJS), E2E, 콘텐츠 본문 검사, 성능을 하드 실패로
막는 것(초기엔 advisory). Phase 2 의 다른 조각(SEO·반응형·Vue)은 각자 별도 스펙.

## 2. 확정된 결정

| # | 결정 | 값 | 근거 |
| --- | --- | --- | --- |
| D1 | 도구 | Pa11y-ci(axe+htmlcs, WCAG2AA) + Lighthouse CI | Pa11y 의 axe 러너가 곧 axe-core → 별도 axe 도구 불필요(3→2 단순화) |
| D2 | 의존성 위치 | package.json 에 넣지 않고 **CI에서만 설치**(npx) | repo 의 런타임3/devDep2 미니멀리즘 유지. pa11y/lighthouse는 chromium 동반으로 무거움 |
| D3 | 사이트 구동 | 기존 `npm run preview`(정적 dist 서빙) 백그라운드 | 새 서버 의존성 0. Lighthouse는 LHCI `staticDistDir` 로 자체 서빙 |
| D4 | 검사 대상 | 페이지 타입별 1개씩 4 URL: `/`, `/it-ai/`, `/it-ai/2026-08-31/`, `/archive/` | 타입 커버, 과잉 방지 |
| D5 | 통과 기준 | Pa11y WCAG2AA error 0(실패), Lighthouse accessibility ≥ 0.9(실패), perf/bp/seo·CWV는 advisory(warn) | 접근성은 결정적이라 하드 게이트, 성능은 CI 노이즈로 흔들리니 초기 advisory |
| D6 | 트리거 | `pull_request`→main + `workflow_dispatch` | 콘텐츠는 매일 main 직접 push 되지만 템플릿 불변 → a11y 회귀는 사람 dev PR 에서만. 콘텐츠 push엔 안 돎(분 절약) |
| D7 | 구조 | `.github/workflows/quality.yml`(job 2개 병렬) + `.pa11yci` + `lighthouserc.json` | a11y/lighthouse 분리로 실패 원인 명확 |

## 3. 아키텍처

```
PR → main (또는 workflow_dispatch)
  └ quality.yml
      ├ job: a11y
      │    checkout → setup-node(.nvmrc) → npm ci → npm run build
      │    → npm run preview (백그라운드, 127.0.0.1:4321) → ready 대기
      │    → npx pa11y-ci (.pa11yci)  →  error>0 이면 실패
      └ job: lighthouse
           checkout → setup-node → npm ci → npm run build
           → npx @lhci/cli autorun (lighthouserc.json, staticDistDir=./dist)
           → accessibility<0.9 이면 실패 / perf·bp·seo·CWV는 warn
```

두 job 은 **병렬·독립** 실행(서로 다른 러너). 실패 시 어느 축인지 즉시 구분된다.

## 4. 컴포넌트와 인터페이스

### 4.1 `.github/workflows/quality.yml` (신규)
- 트리거: `pull_request: [main]` + `workflow_dispatch`.
- `permissions: contents: read` (쓰기 불필요).
- 동시성: `concurrency: group=quality-${{ github.ref }}, cancel-in-progress: true`(같은 PR 새 push 시 이전 실행 취소).
- job `a11y`, job `lighthouse` (§3).
- pa11y·lighthouse는 **워크플로 스텝에서만 설치**(예: `npx --yes pa11y-ci@<pin>`, `npx --yes @lhci/cli@<pin>`), package.json 미변경.
- ubuntu 러너는 Chrome 내장. pa11y(puppeteer)는 `chromeLaunchConfig.args: ["--no-sandbox"]` 필요.

### 4.2 `.pa11yci` (신규, JSON)
- `defaults`: `standard: "WCAG2AA"`, `runners: ["axe","htmlcs"]`, `timeout`, `wait`, `chromeLaunchConfig.args: ["--no-sandbox"]`.
- `urls`: D4 의 4개(`http://127.0.0.1:4321/...`).
- 기본 동작이 error 발견 시 비정상 종료 → job 실패.

### 4.3 `lighthouserc.json` (신규)
- `collect`: `staticDistDir: "./dist"`, `url`: D4 4개 경로, `numberOfRuns: 1`(a11y는 결정적, perf는 advisory라 1회로 충분·빠름).
- `assert.assertions`:
  - `categories:accessibility`: `["error", { "minScore": 0.9 }]`
  - `categories:performance`: `["warn", { "minScore": 0.8 }]`
  - `categories:best-practices`: `["warn", { "minScore": 0.9 }]`
  - `categories:seo`: `["warn", { "minScore": 0.9 }]`
- `upload.target: "filesystem"`(리포트를 러너 아티팩트로) — 외부 업로드 안 함.

## 5. 데이터 플로우 / 판정

1. PR 이 열리거나 갱신되면 quality.yml 발화.
2. 각 job 이 `npm run build` 로 `dist/` 생성.
3. a11y: preview 서버에 4 URL 을 pa11y-ci 로 검사 → WCAG2AA error 0 이어야 통과.
4. lighthouse: LHCI 가 `dist/` 를 자체 서빙, 4 URL 측정 → accessibility ≥ 0.9 이어야 통과, 나머지는 warn.
5. 둘 다 통과해야 PR 체크 green.

## 6. 오류 처리

- 위반 발견 → 해당 job 실패 → PR 병합 차단(브랜치 보호 설정 시). 로그·아티팩트에 상세.
- 서버 미기동/타임아웃 → job 실패(잘못된 green 방지). preview ready 대기에 상한 타임아웃.
- 성능 측정 노이즈 → perf 계열은 warn 이라 PR 을 막지 않음.

## 7. 검증(이 CI 자체를 어떻게 검증하나)

- `workflow_dispatch` 로 현재 main 에 대해 1회 실행 → 4 URL 모두 통과(또는 실제 지적) 확인.
- 로컬 예행: `npm run build && npm run preview` 후 `npx pa11y-ci` / `npx @lhci/cli autorun` 를 손으로 돌려 통과/지적을 미리 확인.
- **베이스라인 정책**: 첫 실행에서 나온 실제 접근성 지적은 (a) 사소하면 구현 단계에서 소스 수정, (b) 임계값 근처면 D5 임계값으로 고정. 성능 지적은 advisory 라 기록만.

## 8. 리스크

| 리스크 | 완화 |
| --- | --- |
| pa11y puppeteer chromium 다운로드 실패 | ubuntu 러너 캐시/재시도. 버전 핀 |
| Lighthouse perf 점수 변동으로 잦은 실패 | perf 계열 warn 으로 시작(D5) |
| 콘텐츠 push 엔 CI 안 돌아 회귀 놓침 | 템플릿은 PR 로만 바뀜 → PR 게이트가 정확한 범위. 필요 시 나중에 `push:main` 추가 |
| 첫 실행에서 다수 실제 지적 | 사이트가 이미 a11y 준수 → 소수 예상. 지적은 구현/임계값으로 처리(§7) |

## 9. 범위

- 이 스펙 = A(a11y·품질 CI)만. Phase 2 의 B(SEO·AI고지)·C(반응형)·D(Vue)는 각자 스펙.
- 브랜치 보호 규칙(이 체크를 필수로)은 저장소 설정이라 사용자 몫(구현계획에 안내만).

구현은 별도 구현 계획 문서에서 원자 단위 태스크로 분해한다.
