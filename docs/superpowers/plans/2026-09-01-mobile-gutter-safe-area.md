# 모바일 좌우 여백 + safe-area 구현 계획 (Phase 2 – C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 모바일에서 콘텐츠가 화면 좌우 끝에 붙지 않도록 20px 여백을 일관 적용하고, safe-area(노치/엣지)까지 대응한다.

**Architecture:** CSS 3곳 수정 — (1) `.article`이 좌우 패딩을 0으로 덮어쓰던 것을 복원해 `.wrap` 여백을 상속, (2) 모바일 `.wrap` 여백 16→20px + `env(safe-area-inset-*)`, (3) viewport meta에 `viewport-fit=cover`. 런타임/의존성 변화 없음. 방금 만든 Quality 게이트 + 브라우저 오버플로 감사로 실증.

**Tech Stack:** Astro 7, 순수 CSS(logical properties, `env()`, `max()`).

**Design 근거 (감사 결과):** 280px에서 홈·상세·아카이브·카테고리 모두 가로 오버플로 없음(표는 `.table-scroll` 내부 스크롤, 터치타겟 ≥24px). 단, 리포트 상세 `.article { padding: 44px 0 60px }`이 좌우를 0으로 만들어 콘텐츠가 끝에 붙음(측정 left=0). 홈은 16px 여백 → 불일치. safe-area 미적용. 사용자 승인: 여백 20px.

## Global Constraints

- Node ≥ 22.12.0. 검증 게이트 `npm run build`.
- **추가/변경이 Quality 게이트(pa11y WCAG2AA, Lighthouse a11y≥0.9)와 가로 오버플로 0을 깨면 안 됨** — 여백을 늘린 뒤에도 280px에서 body 가로 스크롤 0, 표는 `.table-scroll` 내부 스크롤 유지.
- 색 토큰/테마 3중 정의 규칙 유지(이번엔 색 변경 없음). 제목 계층 유지.
- CSS만 수정 — `src/styles/global.css`, `src/layouts/BaseLayout.astro`. 다른 파일 금지.

---

### Task 1: 모바일 좌우 여백 20px + safe-area + viewport-fit

**Files:**
- Modify: `src/styles/global.css` (line 403 `.article`, line 186 모바일 `.wrap`)
- Modify: `src/layouts/BaseLayout.astro` (line 36 viewport meta)

- [ ] **Step 1: `.article` 좌우 패딩 복원 (global.css:403)**

현재:
```css
.article { padding: 44px 0 60px; max-width: calc(var(--maxw-prose) + 40px); }
```
변경 — 세로 패딩만 지정해 `.wrap`의 `padding-inline`(좌우 여백)을 상속하게:
```css
.article { padding-block: 44px 60px; max-width: calc(var(--maxw-prose) + 40px); }
```
(주: `.article` 요소는 `class="wrap article"`. `padding: 44px 0 60px`이 좌우를 0으로 덮어쓰던 것이 원인. `padding-block`으로 바꾸면 `.wrap`의 좌우 20px를 상속.)

- [ ] **Step 2: 모바일 `.wrap` 여백 16→20px + safe-area (global.css:186)**

현재:
```css
@media (max-width: 560px) { .wrap { padding-inline: 16px; } }
```
변경 — 좌우 각각 20px 또는 safe-area 중 큰 값(각 변이 독립 inset을 갖도록 `padding-left/right` 사용):
```css
@media (max-width: 560px) {
  .wrap {
    padding-left: max(20px, env(safe-area-inset-left));
    padding-right: max(20px, env(safe-area-inset-right));
  }
}
```

- [ ] **Step 3: viewport-fit=cover (BaseLayout.astro:36)**

현재:
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```
변경 (env(safe-area-*)가 실제 값을 갖게 하려면 필요):
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

- [ ] **Step 4: 빌드 + 타입 확인**

```bash
npm run build
npm run check
```
Expected: build PASS, check 0 errors.

- [ ] **Step 5: Quality 게이트 로컬 실증 (a11y 회귀 없음)**

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4321 &
PID=$!; until curl -sf http://127.0.0.1:4321/ >/dev/null; do sleep 1; done
npx --yes pa11y-ci@3 --config .pa11yci; ST=$?
kill $PID 2>/dev/null; echo "pa11y exit=$ST"
```
Expected: 4/4 URLs 0 errors. 위반 시 리포트에 기록하고 DONE_WITH_CONCERNS.

- [ ] **Step 6: 커밋**

```bash
git add src/styles/global.css src/layouts/BaseLayout.astro
git commit -m "반응형: 모바일 콘텐츠 좌우 여백 20px 일관 적용 + safe-area 대응"
```

---

## 컨트롤러 검증 (구현 후, 별도)

구현자 보고 후 컨트롤러가 브라우저로 280px·360px에서 재감사한다: (a) 리포트 상세 콘텐츠 left가 20(또는 safe-area)로 바뀌었는지, (b) body 가로 오버플로 여전히 0인지, (c) 표가 `.table-scroll` 내부 스크롤 유지인지. (구현자 subagent는 브라우저 없이 pa11y로만 검증하므로 오버플로 육안 확인은 컨트롤러 몫.)

## Self-Review (설계 대조)

- 승인된 20px 여백 → Step 2. `.article` 0 여백 원인 복원 → Step 1. safe-area/viewport-fit → Step 2·3. 오버플로/a11y 실증 → Step 5 + 컨트롤러 검증.
- Global Constraints: CSS만, 색 변경 없음, 게이트 통과. Placeholder 없음(정확한 before/after).
- 알려진 리스크: 여백 20px로 상세 콘텐츠가 280px에서 240px로 좁아져 표가 더 압축/내부 스크롤될 수 있으나 `.table-scroll`이 처리 — 컨트롤러 검증에서 확인.
