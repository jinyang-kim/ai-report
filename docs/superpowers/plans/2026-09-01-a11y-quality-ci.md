# 접근성·품질 CI 게이트 구현 계획 (Phase 2 – A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PR에서 접근성(WCAG2AA)·성능 회귀를 자동 차단하는 CI 게이트를 추가한다(런타임 소스 무변경).

**Architecture:** `.github/workflows/quality.yml` 이 PR/수동 실행 시 두 job(병렬)을 돌린다 — `a11y`(빌드→preview 서빙→pa11y-ci) 와 `lighthouse`(빌드→LHCI가 dist 자체 서빙→측정). 도구는 CI 스텝에서만 npx로 설치해 package.json을 건드리지 않는다.

**Tech Stack:** GitHub Actions, pa11y-ci(axe+htmlcs, WCAG2AA), @lhci/cli(Lighthouse), Astro 7 정적 빌드, Node 22.12+.

**Spec:** `docs/superpowers/specs/2026-09-01-a11y-quality-ci-design.md`

## Global Constraints

- **Node ≥ 22.12.0** (`.nvmrc`). 검증 게이트는 `npm run build`.
- **런타임 소스(페이지/컴포넌트/스타일) 무변경** — 이 계획은 CI 워크플로 + 설정 파일만 추가.
- **도구는 package.json에 넣지 않는다** — CI 스텝에서만 npx로 설치(repo의 런타임3/devDep2 미니멀리즘 유지).
- 검사 URL은 페이지 타입별 1개씩 정확히 4개: `/`, `/it-ai/`, `/it-ai/2026-08-31/`, `/archive/` (내부 링크는 후행 슬래시; dist 파일은 각 `index.html`).
- 통과 기준: pa11y WCAG2AA **error 0**, Lighthouse **accessibility ≥ 0.9** = 실패; performance/best-practices/seo/CWV = **advisory(warn)**.
- 카테고리 ID: `kr-daily`/`it-ai`/`global-ui-ux` (검사 URL은 `it-ai` 사용).

---

### Task 1: pa11y-ci 설정 + 로컬 a11y 예행

**Files:**
- Create: `.pa11yci`

**Interfaces:**
- Produces: pa11y-ci가 읽는 4 URL·WCAG2AA 설정. Task 3 워크플로의 a11y job이 이 파일을 사용.

- [ ] **Step 1: `.pa11yci` 작성**

```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "runners": ["axe", "htmlcs"],
    "timeout": 30000,
    "wait": 500,
    "chromeLaunchConfig": { "args": ["--no-sandbox"] }
  },
  "urls": [
    "http://127.0.0.1:4321/",
    "http://127.0.0.1:4321/it-ai/",
    "http://127.0.0.1:4321/it-ai/2026-08-31/",
    "http://127.0.0.1:4321/archive/"
  ]
}
```

- [ ] **Step 2: 빌드 + preview 기동 + pa11y-ci 로컬 실행**

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4321 &
PREVIEW_PID=$!
until curl -sf http://127.0.0.1:4321/ >/dev/null; do sleep 1; done
npx --yes pa11y-ci@3 --config .pa11yci ; STATUS=$?
kill $PREVIEW_PID
exit $STATUS
```

Expected: 4 URL 모두 `0 errors`(통과). **실제 error가 나오면** 리포트에 파일·규칙을 그대로 기록하고 status를 DONE_WITH_CONCERNS로 보고(수정은 컨트롤러가 별도 판단 — 베이스라인 정책).

- [ ] **Step 3: 커밋**

```bash
git add .pa11yci
git commit -m "CI: pa11y-ci 접근성 검사 설정(WCAG2AA, 4 URL)"
```

---

### Task 2: Lighthouse CI 설정 + 로컬 예행

**Files:**
- Create: `lighthouserc.json`

**Interfaces:**
- Produces: LHCI 설정(staticDistDir, 4 URL, 임계값). Task 3 워크플로의 lighthouse job이 사용.

- [ ] **Step 1: `lighthouserc.json` 작성**

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "url": [
        "http://localhost/index.html",
        "http://localhost/it-ai/index.html",
        "http://localhost/it-ai/2026-08-31/index.html",
        "http://localhost/archive/index.html"
      ],
      "numberOfRuns": 1
    },
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:performance": ["warn", { "minScore": 0.8 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.9 }]
      }
    },
    "upload": { "target": "filesystem" }
  }
}
```

- [ ] **Step 2: LHCI 로컬 실행**

```bash
npm run build
npx --yes @lhci/cli@0.14 autorun
```

Expected: LHCI가 `./dist`를 자체 서빙하며 4 URL 측정. `accessibility` 모두 ≥ 0.9 → assert 통과(종료코드 0). perf/bp/seo가 임계 미만이면 warn만(실패 아님). **accessibility가 0.9 미만이면** 어느 URL·어떤 audit인지 리포트에 기록하고 DONE_WITH_CONCERNS로 보고.

- [ ] **Step 3: `.lighthouseci/` 산출물 무시**

`.gitignore`에 `.lighthouseci/` 한 줄 추가(로컬 실행 산출물 커밋 방지). 이미 있으면 생략.

- [ ] **Step 4: 커밋**

```bash
git add lighthouserc.json .gitignore
git commit -m "CI: Lighthouse CI 설정(accessibility 하드 게이트, perf advisory)"
```

---

### Task 3: `quality.yml` 워크플로

**Files:**
- Create: `.github/workflows/quality.yml`

**Interfaces:**
- Consumes: `.pa11yci`(Task 1), `lighthouserc.json`(Task 2).
- Produces: PR/수동 실행 시 a11y·lighthouse 게이트.

- [ ] **Step 1: 워크플로 작성**

```yaml
name: Quality

on:
  pull_request:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: quality-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  a11y:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - run: npm ci
      - run: npm run build
      - name: pa11y-ci (build → preview → 검사)
        run: |
          npm run preview -- --host 127.0.0.1 --port 4321 &
          PREVIEW_PID=$!
          for i in $(seq 1 30); do
            curl -sf http://127.0.0.1:4321/ >/dev/null && break
            sleep 1
          done
          curl -sf http://127.0.0.1:4321/ >/dev/null || { echo "preview 서버 미기동"; kill $PREVIEW_PID 2>/dev/null; exit 1; }
          npx --yes pa11y-ci@3 --config .pa11yci
          STATUS=$?
          kill $PREVIEW_PID 2>/dev/null
          exit $STATUS

  lighthouse:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - run: npm ci
      - run: npm run build
      - name: Lighthouse CI (dist 자체 서빙 → 측정)
        run: npx --yes @lhci/cli@0.14 autorun
```

- [ ] **Step 2: YAML 정적 검증**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/quality.yml')); print('YAML OK')"
```

Expected: `YAML OK`.

- [ ] **Step 3: 커밋**

```bash
git add .github/workflows/quality.yml
git commit -m "CI: 접근성·품질 게이트 워크플로(pa11y-ci + Lighthouse CI, PR 트리거)"
```

---

### Task 4: 롤아웃 + 베이스라인 (운영, 일부 사용자 전용)

**Files:** 없음

- [ ] **Step 1: main에 반영 후 실제 실행 확인**

브랜치를 main에 반영(또는 push) 후, `workflow_dispatch`로 "Quality"를 1회 실행 → a11y·lighthouse 두 job green 확인. (실제 CI 실행은 GitHub에서만 가능 — 사용자/머지 후)

- [ ] **Step 2: 지적이 나오면 처리**

첫 실행에서 pa11y error나 accessibility<0.9가 나오면: 사소하면 소스 수정(별도 태스크로), 임계값 근처면 스펙 §7 정책대로 임계값 고정. 성능 warn은 기록만.

- [ ] **Step 3: (선택) 브랜치 보호**

GitHub → Settings → Branches → main 보호 규칙에 "Quality / a11y", "Quality / lighthouse" 체크를 필수로. (저장소 설정, 사용자 전용)

---

## Self-Review (spec 대조)

- **D1 도구(pa11y+lighthouse)** → Task 1·2·3. **D2 CI-only 설치**(`npx --yes …@ver`) → Task 1·2·3 명령. **D3 preview 서빙 / LHCI staticDistDir** → Task 3 a11y 스텝 / Task 2·lighthouserc. **D4 4 URL** → `.pa11yci`·`lighthouserc.json` 동일 4개. **D5 임계값** → lighthouserc assert + pa11y 기본 error 실패. **D6 트리거** → quality.yml on. **D7 구조** → 파일 3개, job 2개.
- 스펙 §5 데이터플로우 → Task 3. §6 오류처리(서버 미기동 exit 1) → Task 3 a11y 스텝. §7 검증/베이스라인 → Task 1 Step2·Task 2 Step2·Task 4. §8 리스크(perf warn) → lighthouserc.
- Placeholder 없음: 실제 JSON/YAML/명령. 버전은 major 핀(`pa11y-ci@3`, `@lhci/cli@0.14`) — Task 1·2 로컬 예행에서 설치·동작 확인됨.
- 4 URL 문자열은 `.pa11yci`(preview 127.0.0.1:4321 기준)와 `lighthouserc.json`(staticDistDir 기준 index.html 경로)에서 형식만 다르고 대상 페이지는 동일.
- 알려진 편차: pa11y는 preview 서버 URL, lighthouse는 LHCI 자체 서버(index.html 경로) — 서빙 방식이 달라 URL 표기가 다른 것은 의도된 것(스펙 D3).
