# SEO·AI 고지 구현 계획 (Phase 2 – B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** robots.txt에 AI 크롤러 허용 정책을 명시하고, 리포트 상세 하단에 "AI 생성" 고지를 추가한다.

**Architecture:** 두 개의 소규모 편집 — `public/robots.txt`(정적)와 `src/pages/[category]/[slug].astro`(상세 템플릿 인라인) + `src/styles/global.css`(고지 스타일). 새 컴포넌트/의존성 없음. 추가분은 Phase 2-A의 Quality 게이트(pa11y+Lighthouse)로 a11y 실증.

**Tech Stack:** Astro 7, 정적 robots.txt, 기존 색 토큰(--ink-3).

**Design 근거:** `docs/superpowers/specs/2026-09-01-a11y-quality-ci-design.md` Phase 2 의 B. 승인된 결정: robots = 주요 AI 크롤러 명시적 Allow; 고지 = `[slug].astro` 인라인 `<footer>`, `--ink-3`(AA), `#sources` 앵커. generatedBy/generatedAt는 화면 미노출(provenance 메타 유지).

## Global Constraints

- Node ≥ 22.12.0. 검증 게이트 `npm run build`.
- **추가 텍스트는 WCAG AA 대비 필수** — 고지 텍스트·링크는 `--ink-3`(4.5:1 보장값) 사용. `--ink-4` 금지(방금 A에서 대비 위반으로 고친 값).
- 제목 계층(h1→h2→h3) 깨지 않기 — 고지는 `<p>`(제목 없음), `<article>` 내부 `<footer>`.
- 내부 링크 후행 슬래시 규칙 유지. `#sources` 는 같은 페이지 앵커라 예외.
- 사이트 URL은 `SITE_URL`/astro.config 기본값(`https://ai-report-navy.vercel.app`) 유지 — robots의 Sitemap 줄 보존.

---

### Task 1: robots.txt AI 크롤러 정책 명시

**Files:**
- Modify: `public/robots.txt`

- [ ] **Step 1: robots.txt 갱신**

기존 `User-agent: * / Allow: /` 와 `Sitemap:` 줄을 유지하고, 그 사이에 주요 AI 크롤러 명시 Allow 를 추가한다. 최종 내용:

```
User-agent: *
Allow: /

# AI 크롤러 — 공개 무료 아카이브라 명시적으로 허용합니다.
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: CCBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://ai-report-navy.vercel.app/sitemap-index.xml
```

- [ ] **Step 2: 빌드 확인 + 산출 확인**

```bash
npm run build
```

Expected: PASS. `public/`는 그대로 복사되므로 `dist/robots.txt`에 위 내용이 있어야 함(`grep -c "Allow" dist/robots.txt` ≥ 10).

- [ ] **Step 3: 커밋**

```bash
git add public/robots.txt
git commit -m "SEO: robots.txt에 AI 크롤러 명시적 허용 정책"
```

---

### Task 2: 리포트 상세 "AI 생성" 고지 푸터

**Files:**
- Modify: `src/pages/[category]/[slug].astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: 없음(정적 문구). `#sources` 앵커는 같은 파일의 `.sources` 섹션.

- [ ] **Step 1: `.sources` 섹션에 앵커 id 부여**

`src/pages/[category]/[slug].astro` 의 `<section class="sources">` 를 `<section class="sources" id="sources">` 로 바꾼다. (출처가 있을 때만 렌더되는 기존 조건은 유지)

- [ ] **Step 2: 고지 `<footer>` 추가**

같은 파일에서 `.pager` `<nav>` 블록 **다음**, `</article>` **앞**에 삽입한다. 출처 유무에 따라 링크/평문 분기:

```astro
    <footer class="ai-disclaimer">
      <p>
        이 리포트는 AI(Claude)가 자동 생성한 요약입니다. 중요한 내용은{' '}
        {
          entry.data.sources.length > 0 ? (
            <a href="#sources">원본 출처</a>
          ) : (
            <span>원본 출처</span>
          )
        }
        로 반드시 확인하세요.
      </p>
    </footer>
```

- [ ] **Step 3: 스타일 추가 (global.css)**

`src/styles/global.css` 에 추가(색은 반드시 `--ink-3`):

```css
.ai-disclaimer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  font-size: 13px;
  color: var(--ink-3);
}
.ai-disclaimer a {
  color: var(--ink-3);
  text-decoration: underline;
}
```

주: `--border` 토큰이 없으면 기존에 쓰는 경계선 토큰명으로 대체(파일에서 확인). 링크는 `--ink-3` + 밑줄로 AA 대비 + 구분성 확보.

- [ ] **Step 4: 빌드 + 타입 확인**

```bash
npm run build
npm run check
```

Expected: build PASS, check 0 errors.

- [ ] **Step 5: Quality 게이트 로컬 실증 (추가분이 a11y 회귀 없는지)**

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4321 &
PID=$!; until curl -sf http://127.0.0.1:4321/ >/dev/null; do sleep 1; done
npx --yes pa11y-ci@3 --config .pa11yci; ST=$?
kill $PID 2>/dev/null; exit $ST
```

Expected: 4 URL 모두 0 errors(특히 `/it-ai/2026-08-31/`에 추가된 고지가 대비/시맨틱 위반 없음). 위반 시 리포트에 기록하고 DONE_WITH_CONCERNS.

- [ ] **Step 6: 커밋**

```bash
git add "src/pages/[category]/[slug].astro" src/styles/global.css
git commit -m "SEO/a11y: 리포트 상세에 AI 생성 고지 푸터(출처 앵커, --ink-3)"
```

---

## Self-Review (설계 대조)

- robots 명시 허용(승인) → Task 1. 고지 푸터(인라인·--ink-3·#sources) → Task 2. generatedBy/generatedAt 미노출 → 두 태스크 모두 사용 안 함(설계 준수).
- Global Constraints: --ink-3 강제(Task 2 Step 3), 제목계층 유지(footer는 p, heading 없음), Sitemap 보존(Task 1).
- 검증: build + check + Quality 게이트 로컬 dry-run(Task 2 Step 5) — A에서 만든 게이트가 B의 추가분을 실제로 검사.
- Placeholder 없음. `--border` 토큰명만 global.css에서 실제 이름 확인 필요(Task 2 Step 3 주석) — 구현자가 파일에서 확인.
