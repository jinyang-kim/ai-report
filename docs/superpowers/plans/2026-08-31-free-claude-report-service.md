# 무료 클라우드 자동 리포트 서비스 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬 Claude Code 예약작업이 하던 리포트 생성을 GitHub Actions(구독 OAuth)로 옮겨, 추가 비용 0으로 평일 아침 자동 생성·커밋·배포되게 한다.

**Architecture:** GitHub Actions cron 이 카테고리별로 Claude Code Action(automation mode)을 실행해 리서치 후 `src/content/<cat>/<KST date>.md` 를 Write 한다. 이어서 워크플로 스텝이 `npm run build`(zod 게이트)로 검증하고 `git push` 로 `main` 에 커밋하면 Vercel Hobby 가 자동 재배포한다. 커밋은 Claude 가 아니라 워크플로가 결정적으로 수행한다.

**Tech Stack:** GitHub Actions, `anthropics/claude-code-action@v1` (`claude_code_oauth_token`), Astro 7, zod content schema, Node 22.12+, Vercel Hobby.

**Spec:** `docs/superpowers/specs/2026-08-31-free-claude-report-service-design.md`

## Global Constraints

- **Node ≥ 22.12.0** (`.nvmrc`, `package.json` engines). Node 20 에서 `astro build` 즉시 실패.
- 카테고리 ID 는 정확히 `kr-daily`, `it-ai`, `global-ui-ux` 세 개. 6개 파일에 하드코딩됨 — 이 계획은 신규 카테고리를 추가하지 않는다.
- 검증 게이트는 **`npm run build`**(zod 콘텐츠 스키마) 와 `npm run check`(타입). 테스트 스위트·린터 없음.
- **파일명 = entry.id = slug = 프론트매터 `date`** 가 반드시 일치. 파일명은 `YYYY-MM-DD.md`.
- 날짜는 KST 달력 날짜. `date: z.coerce.date()` 가 UTC 자정 Date 로 만들므로 `reports.ts` 는 UTC 게터 사용 — 이 규칙을 절대 바꾸지 않는다. 날짜 포맷에 `getFullYear()`/`toLocaleDateString()` 금지.
- `build.format: 'directory'` — 내부 링크는 후행 슬래시.
- OG 이미지는 정적 커밋 파일. 빌드 때 생성하지 않는다.
- 시크릿(`CLAUDE_CODE_OAUTH_TOKEN`)은 repo secret 에만. 로그·클라이언트·URL 노출 금지.
- 프론트매터 필수/기본 필드(현행 `src/content.config.ts`): `title`(string), `date`(YYYY-MM-DD), `summary`(string), `highlights`(string[], 기본 []), `tags`(string[], 기본 []), `alert`(bool, 기본 false), `sources`(`{title,url}[]`, 기본 []), `draft`(bool, 기본 false).

---

## Phase 1 — 자동 생성 파이프라인 (MVP)

이 Phase 만으로 "평일 아침 자동 생성 → 검증 → 커밋 → 배포"가 동작한다. 기존 Astro UI 는 그대로 둔다.

---

### Task 1: 사전 준비 — GitHub App · 구독 토큰 · Vercel 연동 (수동/설정)

**Files:** 없음 (저장소 설정 + 로컬 명령)

**Interfaces:**
- Produces: repo secret `CLAUDE_CODE_OAUTH_TOKEN`, 설치된 Claude GitHub App, 확인된 Vercel Git 연동.

- [ ] **Step 1: Claude GitHub App 설치**

`ai-report` 저장소에 https://github.com/apps/claude 를 설치한다. 권한 중 **Contents/Issues: read & write** 가 이 파이프라인에 필요. (Contents 는 Claude 측 GitHub 인증에, Issues 는 실패 알림에 사용)

- [ ] **Step 2: 구독 OAuth 토큰 발급**

로컬에서 실행:

```bash
claude setup-token
```

Pro/Max 구독으로 인증되는 장수명 토큰이 출력된다. 이 토큰은 **토큰당 API 과금이 없고 구독 사용량으로 계산**된다.

- [ ] **Step 3: repo secret 등록**

GitHub → 저장소 → Settings → Secrets and variables → Actions → New repository secret:
- Name: `CLAUDE_CODE_OAUTH_TOKEN`
- Value: Step 2 의 토큰

- [ ] **Step 4: Vercel Git 연동 확인**

Vercel 프로젝트가 이 저장소의 `main` push 에 자동 배포되는지 확인(현행 유지). 별도 요금 없는 Hobby 플랜으로 충분. 만약 Actions push 에서 배포가 트리거되지 않으면 fallback 으로 Vercel Deploy Hook URL 을 발급해 Task 5 커밋 스텝 뒤에 `curl` 한 줄을 추가한다(선택).

- [ ] **Step 5: 로컬 빌드 확인**

```bash
node -v        # v22.12.0 이상
npm ci
npm run build  # 통과해야 함
```

Node 20 흔적으로 `Cannot find native binding` 이 나면 `node_modules` 와 `package-lock.json` 삭제 후 Node 22 에서 재설치.

---

### Task 2: 콘텐츠 스키마에 생성 메타데이터 필드 추가

**Files:**
- Modify: `src/content.config.ts`

**Interfaces:**
- Produces: `reportSchema` 에 optional 필드 `schemaVersion`, `generatedAt`, `generatedBy`, `sourceUrls`. 전부 optional/기본값 → 기존 파일 하위호환.

- [ ] **Step 1: 스키마에 필드 추가**

`src/content.config.ts` 의 `reportSchema` 에서 `draft` 필드 다음(닫는 `});` 앞)에 추가:

```ts
  /** 스키마 버전. 마이그레이션 추적용 */
  schemaVersion: z.string().default('1.0'),
  /** 생성 시각 (ISO 8601 KST). 예: "2026-08-31T09:00:00+09:00" */
  generatedAt: z.string().optional(),
  /** 생성 주체. "manual" | "claude-code" */
  generatedBy: z.string().optional(),
  /** 리서치에 사용한 원본 URL 목록 (sources 와 별개로 전체 추적용) */
  sourceUrls: z.array(z.string().url()).default([]),
```

토큰/비용 필드는 넣지 않는다(구독 기반이라 토큰 과금 개념이 없음 — 과설계 방지).

- [ ] **Step 2: 빌드로 검증 (기존 콘텐츠가 여전히 통과)**

```bash
npm run build
```

Expected: PASS. 신규 필드가 전부 optional/기본값이라 기존 3개 파일이 스키마 위반 없이 통과.

- [ ] **Step 3: 타입 검증**

```bash
npm run check
```

Expected: error 0 (zod deprecation hint 은 무방).

- [ ] **Step 4: 커밋**

```bash
git add src/content.config.ts
git commit -m "스키마: 생성 메타데이터 필드(schemaVersion/generatedAt/generatedBy/sourceUrls) 추가"
```

---

### Task 3: 기존 리포트 3건 백필

**Files:**
- Create: `scripts/migrate-schema.mjs`

**Interfaces:**
- Consumes: Task 2 의 신규 필드.
- Produces: `src/content/**/*.md` 에 `schemaVersion`/`generatedBy`/`generatedAt` 주입(멱등).

- [ ] **Step 1: 마이그레이션 스크립트 작성**

`scripts/migrate-schema.mjs`:

```js
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CATEGORIES = ['kr-daily', 'it-ai', 'global-ui-ux'];

for (const cat of CATEGORIES) {
  const dir = join('src/content', cat);
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  } catch {
    continue; // 카테고리 디렉터리 없으면 건너뜀
  }
  for (const f of files) {
    const p = join(dir, f);
    let txt = readFileSync(p, 'utf8');
    if (/^\s*generatedBy:/m.test(txt)) {
      console.log('skip (이미 처리):', p);
      continue;
    }
    const m = txt.match(/^date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/m);
    const date = m ? m[1] : f.replace(/\.md$/, '');
    const inject =
      `schemaVersion: "1.0"\n` +
      `generatedBy: manual\n` +
      `generatedAt: "${date}T09:00:00+09:00"`;
    // 파일 시작의 여는 --- 에는 앞 개행이 없으므로, 첫 \n---\n 이 닫는 구분선.
    const next = txt.replace(/\n---\n/, `\n${inject}\n---\n`);
    if (next === txt) {
      console.warn('skip (프론트매터 구분선 못 찾음):', p);
      continue;
    }
    writeFileSync(p, next);
    console.log('migrated:', p);
  }
}
```

- [ ] **Step 2: 실행**

```bash
node scripts/migrate-schema.mjs
```

Expected: `migrated: src/content/it-ai/2026-08-31.md` 등 3줄.

- [ ] **Step 3: 재실행으로 멱등성 확인**

```bash
node scripts/migrate-schema.mjs
```

Expected: 3줄 모두 `skip (이미 처리)`.

- [ ] **Step 4: 빌드로 검증**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add scripts/migrate-schema.mjs src/content/
git commit -m "스키마: 기존 리포트 3건에 생성 메타 백필 + 1회성 마이그레이션 스크립트"
```

---

### Task 4: 카테고리별 생성 프롬프트 작성

**Files:**
- Create: `.github/prompts/kr-daily.md`
- Create: `.github/prompts/it-ai.md`
- Create: `.github/prompts/global-ui-ux.md`

**Interfaces:**
- Produces: 각 카테고리의 생성 지침. Task 5 워크플로가 Claude 에게 "이 파일을 읽고 따르라"고 지시.

- [ ] **Step 1: 공통 출력 계약 + kr-daily 프롬프트 작성**

`.github/prompts/kr-daily.md` (아래 템플릿 사용, 도메인 지침은 기존 `~/.claude/scheduled-tasks/ai-report-kr-daily/SKILL.md` 에서 이식):

```markdown
# 역할
너는 한국 일일 브리핑 작성자다. 오늘의 한국 주요 소식을 조사해 한 편의 리포트를 쓴다.

# 리서치
- WebSearch/WebFetch 로 신뢰할 수 있는 한국 매체를 우선 조사한다.
- 각 항목은 반드시 출처 URL 을 확보한다. 확인 안 된 내용은 쓰지 않는다.

# 출력 (매우 중요 — 형식이 어긋나면 빌드가 실패한다)
- 대상 파일 경로에 마크다운 한 개를 Write 한다.
- 프론트매터는 아래 필드를 정확히 채운다 (src/content.config.ts 스키마와 일치해야 함):
  - title: string (예: "한국 브리핑 — 2026년 9월 1일")
  - date: 오늘 KST 날짜 YYYY-MM-DD (파일명과 반드시 동일)
  - summary: 2~3문장 한 줄 요약
  - highlights: 문자열 3개 배열 ("오늘의 핵심")
  - tags: 문자열 배열
  - alert: 즉시 조치 이슈가 있으면 true, 없으면 false
  - sources: [{ title, url }] 배열 — 인용한 출처
  - draft: false
  - schemaVersion: "1.0"
  - generatedBy: claude-code
  - generatedAt: "<오늘 KST>T09:00:00+09:00"
  - sourceUrls: 조사에 사용한 URL 문자열 배열
- 본문은 `##` 소제목으로 구성한다. h1(`#`)은 쓰지 않는다(제목은 프론트매터 title 이 담당).
- 넓은 표는 마크다운 표로 두되 열 수를 과하게 늘리지 않는다.
- 링크·수치·인용은 출처와 일치해야 한다.

# 금지
- git 명령을 실행하지 않는다. 파일 생성만 한다.
```

- [ ] **Step 2: it-ai / global-ui-ux 프롬프트 작성**

같은 출력 계약(프론트매터 필드·본문 규칙·금지)을 유지하고 `# 역할`·`# 리서치` 섹션만 카테고리에 맞게 바꾼다. 각각 기존 `~/.claude/scheduled-tasks/ai-report-it-ai/SKILL.md`, `~/.claude/scheduled-tasks/ai-report-global-ui-ux/SKILL.md` 의 도메인 지침을 이식한다. **"출력"과 "금지" 섹션은 세 파일이 동일**해야 한다.

- [ ] **Step 3: 프론트매터 계약 검증(수동 리뷰)**

세 프롬프트의 프론트매터 필드 목록이 `src/content.config.ts`(Task 2 반영본)와 1:1로 맞는지 눈으로 대조. `date`==파일명 규칙, `generatedBy: claude-code` 명시 확인.

- [ ] **Step 4: 커밋**

```bash
git add .github/prompts/
git commit -m "프롬프트: 카테고리별 생성 지침 3종 이관(로컬 SKILL.md → 저장소)"
```

---

### Task 5: 생성 워크플로 `.github/workflows/generate.yml`

**Files:**
- Create: `.github/workflows/generate.yml`

**Interfaces:**
- Consumes: secret `CLAUDE_CODE_OAUTH_TOKEN`, `.github/prompts/<category>.md`, Task 2 스키마.
- Produces: 평일 자동 실행 + `workflow_dispatch` 수동 실행. 카테고리별 `src/content/<cat>/<date>.md` 커밋.

- [ ] **Step 1: 워크플로 작성**

`.github/workflows/generate.yml`:

```yaml
name: Generate Reports

on:
  schedule:
    # cron 은 UTC. 00:05/00:10/00:15 UTC = 09:05/09:10/09:15 KST (평일)
    - cron: "5 0 * * 1-5"   # kr-daily
    - cron: "10 0 * * 1-5"  # it-ai
    - cron: "15 0 * * 1-5"  # global-ui-ux
  workflow_dispatch:
    inputs:
      category:
        description: "kr-daily | it-ai | global-ui-ux"
        required: true
      date:
        description: "YYYY-MM-DD (비우면 오늘 KST)"
        required: false

# push 경합 방지: 그룹 내 1개만 실행, 나머지는 큐잉
concurrency:
  group: generate-main
  cancel-in-progress: false

jobs:
  generate:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: write
      issues: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Resolve category and date
        id: ctx
        run: |
          case "${{ github.event.schedule }}" in
            "5 0 * * 1-5")  CATEGORY=kr-daily ;;
            "10 0 * * 1-5") CATEGORY=it-ai ;;
            "15 0 * * 1-5") CATEGORY=global-ui-ux ;;
            *)              CATEGORY="${{ github.event.inputs.category }}" ;;
          esac
          case "$CATEGORY" in
            kr-daily|it-ai|global-ui-ux) ;;
            *) echo "잘못된 category: '$CATEGORY'"; exit 1 ;;
          esac
          DATE="${{ github.event.inputs.date }}"
          [ -z "$DATE" ] && DATE="$(TZ=Asia/Seoul date +%F)"
          echo "category=$CATEGORY" >> "$GITHUB_OUTPUT"
          echo "date=$DATE" >> "$GITHUB_OUTPUT"
          echo "file=src/content/$CATEGORY/$DATE.md" >> "$GITHUB_OUTPUT"

      - name: Skip if report already exists
        id: exists
        run: |
          if [ -f "${{ steps.ctx.outputs.file }}" ]; then
            echo "이미 존재 → skip: ${{ steps.ctx.outputs.file }}"
            echo "skip=true" >> "$GITHUB_OUTPUT"
          else
            echo "skip=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Generate report with Claude Code
        if: steps.exists.outputs.skip == 'false'
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: |
            오늘(KST ${{ steps.ctx.outputs.date }})의 "${{ steps.ctx.outputs.category }}" 리포트를 생성한다.
            1. .github/prompts/${{ steps.ctx.outputs.category }}.md 를 Read 하고 그 지침을 따른다.
            2. src/content.config.ts 를 Read 해 프론트매터 스키마를 확인한다.
            3. WebSearch/WebFetch 로 조사한다.
            4. 완성된 마크다운을 정확히 이 경로에 Write 한다: ${{ steps.ctx.outputs.file }}
               - 프론트매터 date 는 ${{ steps.ctx.outputs.date }} 이고 파일명과 일치해야 한다.
               - generatedBy: claude-code, generatedAt: "${{ steps.ctx.outputs.date }}T09:00:00+09:00"
            git 명령은 실행하지 않는다. 파일 생성만 한다.
          claude_args: |
            --max-turns 40
            --allowedTools "Read,Write,Edit,Glob,Grep,WebSearch,WebFetch"

      - name: Verify file was created
        if: steps.exists.outputs.skip == 'false'
        run: test -f "${{ steps.ctx.outputs.file }}" || { echo "Claude 가 파일을 만들지 않음"; exit 1; }

      - name: Setup Node
        if: steps.exists.outputs.skip == 'false'
        uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc

      - name: Validate with build gate
        if: steps.exists.outputs.skip == 'false'
        run: |
          npm ci
          npm run build

      - name: Commit and push
        if: steps.exists.outputs.skip == 'false'
        run: |
          git config user.name "ai-report-bot"
          git config user.email "sunlover011@gmail.com"
          git add "${{ steps.ctx.outputs.file }}"
          git commit -m "[${{ steps.ctx.outputs.category }}] ${{ steps.ctx.outputs.date }} 자동 생성"
          for i in 1 2 3; do
            if git push origin HEAD:main; then exit 0; fi
            echo "push 실패, rebase 후 재시도 ($i/3)"
            git fetch origin main
            git rebase origin/main
          done
          echo "3회 재시도 후 push 실패"; exit 1
```

- [ ] **Step 2: 워크플로 YAML 정적 검증**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/generate.yml')); print('YAML OK')"
```

Expected: `YAML OK`.

- [ ] **Step 3: 커밋 & 푸시(워크플로는 main 에 있어야 스케줄 동작)**

```bash
git add .github/workflows/generate.yml
git commit -m "CI: 리포트 자동 생성 워크플로(GitHub Actions + Claude Code OAuth)"
git push origin main
```

- [ ] **Step 4: 수동 e2e 실행 (과거 날짜로 안전 테스트)**

GitHub → Actions → "Generate Reports" → Run workflow → `category: it-ai`, `date: 2099-01-01` 입력 후 실행. (미래/더미 날짜라 실제 아카이브에 영향 최소)

Expected: Claude 가 `src/content/it-ai/2099-01-01.md` 생성 → build 통과 → 커밋 → push. Vercel 배포 트리거 확인.

- [ ] **Step 5: 멱등성 확인**

같은 입력(`it-ai`, `2099-01-01`)으로 다시 Run.

Expected: "이미 존재 → skip" 로 조기 종료, 커밋 없음.

- [ ] **Step 6: 테스트 산출물 정리**

```bash
git pull
git rm src/content/it-ai/2099-01-01.md
git commit -m "정리: e2e 테스트 산출물 제거"
git push origin main
```

---

### Task 6: 실패 알림 + 강건화

**Files:**
- Modify: `.github/workflows/generate.yml`

**Interfaces:**
- Consumes: Task 5 워크플로.
- Produces: 실패 시 GitHub Issue 자동 생성.

- [ ] **Step 1: 실패 알림 스텝 추가**

`generate.yml` 의 `steps:` 맨 끝에 추가:

```yaml
      - name: Open issue on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const cat = '${{ steps.ctx.outputs.category }}' || '(unknown)';
            const date = '${{ steps.ctx.outputs.date }}' || '(unknown)';
            const runUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
            const title = `[생성 실패] ${cat} ${date}`;
            // 같은 제목의 열린 이슈가 있으면 중복 생성하지 않음
            const existing = await github.rest.issues.listForRepo({
              owner: context.repo.owner, repo: context.repo.repo,
              state: 'open', labels: 'cron-failure',
            });
            if (existing.data.some((i) => i.title === title)) return;
            await github.rest.issues.create({
              owner: context.repo.owner, repo: context.repo.repo,
              title,
              body: `카테고리: ${cat}\n날짜(KST): ${date}\n로그: ${runUrl}`,
              labels: ['cron-failure'],
            });
```

- [ ] **Step 2: YAML 재검증**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/generate.yml')); print('YAML OK')"
```

- [ ] **Step 3: 실패 경로 e2e 확인**

`workflow_dispatch` 로 `category: it-ai`, `date: 2099-01-02` 를 실행하되, 일시적으로 프롬프트가 잘못된 경로에 쓰도록 유도하거나(또는 Step 4 검증이 실패하도록) 강제 실패시켜 `cron-failure` 라벨 이슈가 생성되는지 확인. 확인 후 이슈 닫고, 유도한 임시 변경은 되돌린다.

- [ ] **Step 4: 커밋 & 푸시**

```bash
git add .github/workflows/generate.yml
git commit -m "CI: 생성 실패 시 GitHub Issue 자동 알림(중복 억제)"
git push origin main
```

---

### Task 7: 컷오버 — 로컬 예약작업 정리 (운영)

**Files:** 없음 (로컬 스케줄 설정)

- [ ] **Step 1: 클라우드 파이프라인 안정성 확인**

최소 평일 2~3회 자동 실행이 성공하고, 3개 카테고리 파일이 정상 커밋·배포되는지 확인.

- [ ] **Step 2: 로컬 예약작업 비활성화(중복 방지)**

`~/.claude/scheduled-tasks/ai-report-*` 3개를 비활성화한다. 멱등 skip 이 있어 중복 커밋은 안 나지만, 불필요한 로컬 실행을 없앤다. **삭제하지 말고 비활성화**로 두어 fallback 으로 남긴다(스펙 R9).

- [ ] **Step 3: 문서 갱신**

`CLAUDE.md` 의 "발행 흐름" 표를 로컬 예약작업 → GitHub Actions 로 갱신한다(별도 소규모 편집).

---

## Phase 2 — 품질·프론트 (별도 계획으로 확장)

Phase 1 이 배포된 뒤 아래를 **별도 plan 문서**로 상세화해 실행한다(각 항목이 독립 실행·검증 가능):

- **FE-1** `@astrojs/vue` 등록 + 아카이브 검색 `ArchiveSearch.vue`(현행 data-text 필터 이관).
- **FE-2** 테마 토글 `useTheme` composable + `ThemeToggle.vue`, **aria-label 상태 동기화(WCAG 4.1.2)**.
- **QA-1** `.github/workflows/a11y.yml`: PR 게이트로 axe-core + Pa11y(`WCAG2AA`) + Lighthouse CI(접근성 ≥ 0.9).
- **PERF-1** LCP<2.5s / INP<200ms / CLS<0.1 실측(PSI), 폰트 preload·이미지 width/height 유지.
- **RESP-1** 브레이크포인트 280/360/375/768/1024px, Z Fold 커버 280–360px 에서 2열 금지·가로 스크롤 0, `.table-scroll` 유지, `env(safe-area-*)`.
- **SEO-1** robots AI크롤러 정책 명시, 리포트 푸터 "AI 생성 + 출처" 고지(`generatedBy`/`generatedAt` 활용).

## Phase 3 — 고도화 (later)

- Pagefind 전문검색(수백 건+), (필요 시)Supabase 이전(수천 건+), React 학습용 `/experimental` 격리 라우트.

---

## Self-Review (spec 대조)

- **D1 스케줄(GitHub Actions)** → Task 5. **D2 Claude Code OAuth** → Task 1·5. **D3 프론트 유지** → Phase 1 은 UI 무변경, Phase 2 로 아일랜드. **D4 파일 저장** → Task 5 커밋. **D5 Vercel Hobby** → Task 1 Step 4. **D6 모바일 하한** → Phase 2 RESP-1.
- 스펙 §4.1–4.4(워크플로·프롬프트·스키마·백필) → Task 2–5. §5 멱등/데이터플로우 → Task 5 Step 4·5. §6 오류처리 → Task 6. §7 보안(토큰 secret) → Task 1·5. §8 검증(build 게이트) → Task 5.
- Placeholder 없음: 모든 코드/YAML/명령이 실제 내용. `category` 값은 세 곳(`case` 매핑, 검증, 프롬프트 경로)에서 동일 문자열 사용.
- 알려진 편차(스펙 대비): cron 을 `timezone: Asia/Seoul` + `5 9` 대신 **UTC `5 0`/`10 0`/`15 0`(=09:05/09:10/09:15 KST)** 로 표기 — `github.event.schedule` 문자열 매칭이 이식성 높고, KST 날짜는 `TZ=Asia/Seoul date` 로 별도 산출하므로 결과 동일하고 더 견고.
