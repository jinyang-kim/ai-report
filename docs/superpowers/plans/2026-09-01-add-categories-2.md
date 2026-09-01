# 카테고리 3종 추가 + 프롬프트 보완 구현 계획 (Phase A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** education·finance·mobility 3개 카테고리를 추가해 총 10개로 확장하고, 게임 콘솔 커버리지 강화 + 신규 4종(electronics/health/gaming/food-travel) 제목 형식 통일까지 반영한다.

**Architecture:** 카테고리 하드코딩 8지점 등록 + 색토큰(3블록) + 프롬프트 + cron + OG. RSS·홈·아카이브·sitemap·네비 자동 반영(GNB 그룹화는 Phase B 별도). 신규 색은 pa11y 프로그램 검증.

**Tech Stack:** Astro 7, zod, CSS 색토큰(3중 테마), make-og.py, GitHub Actions.

## Global Constraints

- Node ≥ 22.12.0. 게이트 `npm run build`(zod) + `npm run check` + Quality `pa11y-ci`.
- 신규 ID 정확히: `education`, `finance`, `mobility`. 하드코딩 지점 전부 동일 문자열.
- 색토큰 3블록(라이트/OS다크/수동다크) 모두. `--cat-*-solid` vs 흰글자 ≥ 4.7:1, `--chip-*-fg/bg` ≥ 4.5:1. **기존 7색(주황·파랑·초록·청록·자홍·앰버·보라)과 겹치지 않는 hue** 사용.
- 프롬프트 `# 출력`·`# 금지`는 기존과 바이트 동일(인라인 각주·출처 정확성 포함).

---

### Task 1: 카테고리 3종 등록 (코드 4곳 + 폴더)

**Files:** Modify `src/lib/categories.ts`, `src/content.config.ts`, `src/lib/reports.ts`, `scripts/publish.py`; Create `src/content/{education,finance,mobility}/.gitkeep`

- [ ] **Step 1: categories.ts — CATEGORY_IDS + CATEGORIES 3개**

CATEGORY_IDS 에 `'education', 'finance', 'mobility'` 추가. CATEGORIES 에(accent 는 Task 2 검증 후 확정될 수 있음, 우선 제안값):
```ts
  education: {
    id: 'education', name: '교육', short: '교육',
    description: '한국 입시·수능·교육정책·사교육·에듀테크·대학, 그리고 교육청 소식까지 정리합니다.',
    accent: '#4f5bd5', accentDark: '#6b76e0',
  },
  finance: {
    id: 'finance', name: '경제·재테크', short: '경제',
    description: '금리·부동산·주식·코인 등 한국 경제와 재테크 흐름을 정리합니다.',
    accent: '#0f8a6a', accentDark: '#17a37f',
  },
  mobility: {
    id: 'mobility', name: '자동차·모빌리티', short: '모빌리티',
    description: '전기차·신차·자율주행 등 자동차와 모빌리티 산업 동향을 정리합니다.',
    accent: '#d64545', accentDark: '#e06060',
  },
```
(제안 색: education=인디고, finance=딥그린-청록계 아닌 딥에메랄드, mobility=레드. Task 2에서 대비 검증·조정.)

- [ ] **Step 2: content.config.ts collections 3개** — `education: collection('education')` 등.
- [ ] **Step 3: reports.ts AnyEntry** — 3개 컬렉션 엔트리 추가(기존 패턴 확인 후).
- [ ] **Step 4: publish.py CATEGORIES 집합 3개.**
- [ ] **Step 5: 빈 폴더** — `for c in education finance mobility; do mkdir -p src/content/$c; touch src/content/$c/.gitkeep; done`
- [ ] **Step 6: 검증** — `npm run build` + `npm run check` PASS(빈 컬렉션 허용).
- [ ] **Step 7: 커밋** — `git commit -m "카테고리: education·finance·mobility 등록"`

---

### Task 2: 색 토큰 3세트(3블록) + 카드 규칙 + 대비 검증

**Files:** Modify `src/styles/global.css`

- [ ] **Step 1~2: 3블록에 3세트 추가** — 각 블록(라이트/OS다크/수동다크)에 `--cat-<id>`, `--cat-<id>-solid`, `--chip-<id>-bg`, `--chip-<id>-fg` for education/finance/mobility. 라이트/다크 값 구분. 기존 색과 구분되는 hue(인디고/에메랄드/레드).
- [ ] **Step 3: `.card--<id>` 3개** — `.card--education { --card-accent: var(--cat-education); }` 등.
- [ ] **Step 4: 대비 프로그램 검증** — 스크립트로 WCAG 대비 계산: `--cat-*-solid` vs #fff ≥ 4.7, `--chip-*-fg` vs `--chip-*-bg` ≥ 4.5 (라이트+다크). 미달 시 조정 후 재계산. `npm run build` PASS.
- [ ] **Step 5: 커밋** — `git commit -m "카테고리: 신규 3종 색 토큰(3블록)+카드, 대비 검증"`

---

### Task 3: OG 이미지 3장

**Files:** Modify `scripts/make-og.py`; Create `public/og/{education,finance,mobility}.png`

- [ ] **Step 1: CARDS 3개 추가** — 색은 categories.ts accent 와 일치(Task 2 조정 반영).
- [ ] **Step 2: 실행** — `python3 scripts/make-og.py` → 3 PNG 생성 확인. (실패 시 CARDS만 커밋 + DONE_WITH_CONCERNS)
- [ ] **Step 3: 커밋** — `git commit -m "카테고리: 신규 3종 OG 이미지"`

---

### Task 4: 프롬프트 (신규 3종 + 게임 콘솔 강화 + 제목 통일)

**Files:** Create `.github/prompts/{education,finance,mobility}.md`; Modify `.github/prompts/{gaming,electronics,health}.md`

- [ ] **Step 1: 신규 3종 프롬프트** — `# 출력`·`# 금지`는 it-ai.md 와 바이트 동일 복사. `# 역할`·`# 리서치` 도메인별:
  - education: 한국 입시·수능·교육정책(교육부·교육청)·사교육·에듀테크·대학. 공신력 매체·기관 발표. **제목(title)은 "교육 — YYYY년 M월 D일" 형식 고정**(역할 섹션에 명시).
  - finance: 한국 금리·부동산·주식·코인·재테크. 매체·기관. 투자권유 아닌 정보 제공 톤. **제목 "경제·재테크 — YYYY년 M월 D일" 고정.**
  - mobility: 한국 전기차·신차·자율주행·모빌리티. 공식·매체. **제목 "자동차·모빌리티 — YYYY년 M월 D일" 고정.**
- [ ] **Step 2: 게임 콘솔 강화** — `.github/prompts/gaming.md` 의 `# 역할`/`# 리서치`에: PlayStation(State of Play·독점작), Nintendo(Direct·스위치2·퍼스트파티), **Xbox(Game Pass·엑스박스)** 를 콘솔 전용으로 우선 점검하도록 명시. 리서치 소스에 Xbox 추가. 섹션 예시에 "콘솔 플랫폼" 추가. (출력/금지 섹션은 건드리지 않음)
- [ ] **Step 3: 제목 통일** — electronics/health/gaming 의 `# 역할` 섹션에 제목 형식 고정 라인 추가(food-travel 패턴): "리포트 제목(프론트매터 title)은 반드시 '전자기기 —' / '의료·헬스케어 —' / '게임 — YYYY년 M월 D일' 형식으로 시작한다." (출력/금지 불변)
- [ ] **Step 4: 검증** — 신규 3 + 기존(gaming/electronics/health) 의 `# 출력` 이후가 it-ai.md 와 동일한지 diff. 6개 파일 OK.
- [ ] **Step 5: 커밋** — `git commit -m "프롬프트: 신규 3종 + 게임 콘솔 강화 + 제목 형식 통일"`

---

### Task 5: generate.yml cron 3줄 + 매핑

**Files:** Modify `.github/workflows/generate.yml`

- [ ] **Step 1: schedule 3줄 추가** (8분 간격, gaming 09:53 다음):
```yaml
    - cron: "1 1 * * 1-5"   # 01:01 UTC = 10:01 KST (education)
    - cron: "9 1 * * 1-5"   # 01:09 UTC = 10:09 KST (finance)
    - cron: "17 1 * * 1-5"  # 01:17 UTC = 10:17 KST (mobility)
```
- [ ] **Step 2: case 매핑 3개 + 검증 whitelist 3개** — cron 문자열과 case 문자열 바이트 동일. whitelist(`kr-daily|...|gaming`)에 `|education|finance|mobility` 추가. workflow_dispatch description 에도 3개 추가.
- [ ] **Step 3: YAML 검증 + cron↔case 일치 확인 + 커밋**

---

### Task 6: 컨트롤러 빈 상태 + 색 검증

빌드 후 브라우저로 신규 3개 카테고리 페이지(빈 상태) 200·렌더, 네비 10개 노출 확인. (GNB 그룹화는 Phase B)

### Task 7: 롤아웃 (머지 후, 순차)

신규 3개 각각 `gh workflow run` **순차**(concurrency 취소 방지) 첫 리포트 생성.

## Self-Review
- 3 카테고리 8지점 → Task 1~5. 게임 콘솔·제목통일 → Task 4. 색 3블록·대비 → Task 2. cron 8분 연장 → Task 5.
- 제안 hex 는 검증 전제 — pa11y/대비계산 미달 시 조정(Task 2).
