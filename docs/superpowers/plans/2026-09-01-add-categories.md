# 카테고리 4종 추가 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** electronics·health·food-travel·gaming 4개 카테고리를 등록해 총 7개로 확장하고, 7개 모두 평일 아침 자동 생성되게 한다.

**Architecture:** 카테고리 ID 를 하드코딩 지점 전체에 등록(6 코드파일 + 색토큰 3블록 + 프롬프트 + cron + OG). RSS·홈·아카이브·sitemap 은 자동 반영. 신규 색은 pa11y(Quality 게이트)로 대비 검증.

**Tech Stack:** Astro 7 content collections, zod, CSS 색토큰(3중 테마), Python make-og.py, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-01-add-categories-design.md`

## Global Constraints

- Node ≥ 22.12.0. 검증 게이트 `npm run build`(zod) + `npm run check`(타입) + Quality `pa11y-ci`(WCAG2AA).
- 신규 ID 정확히: `electronics`, `health`, `food-travel`, `gaming`. 하드코딩 지점에 **하나도 빠짐없이** 등록.
- 색 토큰은 **라이트 `:root` / OS다크 / 수동다크 3블록 모두**에 넣는다. `--cat-*-solid` 는 흰 글자 대비 ≥ 4.7:1, chip fg/bg ≥ 4.5:1 — pa11y 로 검증하고 미달 시 조정.
- 프롬프트의 `# 출력`·`# 금지` 섹션은 기존 3종과 **바이트 동일**(인라인 각주·출처 정확성 포함).
- 내부 링크 후행 슬래시. 날짜 UTC 게터 규칙 유지.

---

### Task 1: 카테고리 등록 (색·OG·프롬프트 제외한 코드 4곳)

**Files:**
- Modify: `src/lib/categories.ts`, `src/content.config.ts`, `src/lib/reports.ts`, `scripts/publish.py`
- Create: `src/content/{electronics,health,food-travel,gaming}/.gitkeep`

- [ ] **Step 1: `src/lib/categories.ts` — CATEGORY_IDS + CATEGORIES 4개 추가**

`CATEGORY_IDS` 배열에 `'electronics', 'health', 'food-travel', 'gaming'` 추가. `CATEGORIES` 에:

```ts
  electronics: {
    id: 'electronics', name: '전자기기', short: '전자',
    description: '한국 가전·모바일·반도체·IT기기의 신제품, 리뷰, 업계 소식을 정리합니다.',
    accent: '#0e9bb0', accentDark: '#1fb3c9',
  },
  health: {
    id: 'health', name: '의료·헬스케어', short: '의료',
    description: '한국 의료·바이오·제약·헬스케어와 건강 정책 소식. 의학적 조언이 아닌 정보 제공입니다.',
    accent: '#d84a6a', accentDark: '#e56b86',
  },
  'food-travel': {
    id: 'food-travel', name: '맛집·여행', short: '맛집',
    description: '한국에서 화제인 맛집과 여행지 — 인스타·블로그 트렌드와 검증된 정보를 함께 담습니다.',
    accent: '#d99019', accentDark: '#e5a72f',
  },
  gaming: {
    id: 'gaming', name: '게임', short: '게임',
    description: '온라인·모바일·콘솔 게임의 출시, 업데이트, 이스포츠와 업계 동향을 정리합니다.',
    accent: '#7c5cd6', accentDark: '#9377e0',
  },
```

- [ ] **Step 2: `src/content.config.ts` — collections 4개 추가**

`collections` 맵에 `electronics: collection('electronics')` 등 4개 추가.

- [ ] **Step 3: `src/lib/reports.ts` — AnyEntry 유니온에 4개 추가**

`AnyEntry` 타입(3개 컬렉션 엔트리 유니온)에 신규 4개 컬렉션 엔트리 타입을 추가한다. 파일에서 기존 유니온 형태를 확인해 동일 패턴으로 확장.

- [ ] **Step 4: `scripts/publish.py` — CATEGORIES 집합에 4개 추가**

`CATEGORIES` 집합(문자열)에 4개 ID 추가.

- [ ] **Step 5: 빈 콘텐츠 폴더 4개 생성**

```bash
for c in electronics health food-travel gaming; do mkdir -p "src/content/$c"; touch "src/content/$c/.gitkeep"; done
```

- [ ] **Step 6: 빌드/타입 검증 (빈 컬렉션 허용 확인)**

```bash
npm run build
npm run check
```
Expected: PASS. 빈 컬렉션에서 빌드가 깨지면(에러) 리포트에 기록하고 DONE_WITH_CONCERNS — 첫 리포트 없이 빈 컬렉션이 안 되면 각 폴더에 draft 플레이스홀더가 필요할 수 있음(컨트롤러 판단).

- [ ] **Step 7: 커밋**

```bash
git add src/lib/categories.ts src/content.config.ts src/lib/reports.ts scripts/publish.py src/content/
git commit -m "카테고리: electronics·health·food-travel·gaming 등록(코드 4곳 + 빈 폴더)"
```

---

### Task 2: 색 토큰 4세트 (3블록) + 카드 규칙 + pa11y 검증

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: 라이트 `:root` 블록에 4세트 추가**

기존 `--cat-*` / `--cat-*-solid` / `--chip-*-bg` / `--chip-*-fg` 라이트 정의 뒤에 추가(제안값 — Step 4에서 검증):

```css
  --cat-electronics: #0e9bb0;  --cat-health: #d84a6a;  --cat-food-travel: #d99019;  --cat-gaming: #7c5cd6;
  --cat-electronics-solid: #0c7d8f;  --cat-health-solid: #c13456;  --cat-food-travel-solid: #a8710f;  --cat-gaming-solid: #6a49c4;
  --chip-electronics-bg: #e2f5f8;  --chip-electronics-fg: #0a6675;
  --chip-health-bg: #fdeaef;       --chip-health-fg: #a82945;
  --chip-food-travel-bg: #fbf1dd;  --chip-food-travel-fg: #8f5e0c;
  --chip-gaming-bg: #efeafb;       --chip-gaming-fg: #543aa8;
```

- [ ] **Step 2: OS다크 + 수동다크 블록에 4세트 추가 (동일 값)**

두 다크 블록 각각에 다음을 추가(두 블록 값 동일):

```css
  --cat-electronics: #1fb3c9;  --cat-health: #e56b86;  --cat-food-travel: #e5a72f;  --cat-gaming: #9377e0;
  --cat-electronics-solid: #1795aa;  --cat-health-solid: #d05068;  --cat-food-travel-solid: #c78a1a;  --cat-gaming-solid: #7a5cd0;
  --chip-electronics-bg: #0e2e33;  --chip-electronics-fg: #5cccdd;
  --chip-health-bg: #3a1a22;       --chip-health-fg: #f08ca0;
  --chip-food-travel-bg: #33280f;  --chip-food-travel-fg: #f0c264;
  --chip-gaming-bg: #241a3a;       --chip-gaming-fg: #b8a4f0;
```

- [ ] **Step 3: `.card--<id>` 규칙 4개 추가**

기존 `.card--kr-daily` 등의 규칙을 찾아 동일 패턴으로 4개 추가(좌측 바·칩 색 등이 `--cat-<id>`/`--chip-<id>-*` 를 참조). 기존 규칙 형태를 그대로 따른다.

- [ ] **Step 4: 빌드 + pa11y 대비 검증 (핵심)**

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4321 &
PID=$!; until curl -sf http://127.0.0.1:4321/ >/dev/null; do sleep 1; done
npx --yes pa11y-ci@3 --config .pa11yci; ST=$?
kill $PID 2>/dev/null; echo "pa11y exit=$ST"
```
Expected: 4/4 0 errors. **색 대비 위반(color-contrast)이 나오면** 어느 토큰인지 기록하고, 해당 `--*-solid`/`--chip-*-fg` 를 더 어둡게(라이트)/더 밝게(다크) 조정 후 재실행. 통과할 때까지 반복. (칩은 현재 홈/목록에 렌더되지만 빈 카테고리라 신규 칩이 안 보일 수 있음 — Step 6에서 플레이스홀더로 확인)

- [ ] **Step 5: 커밋**

```bash
git add src/styles/global.css
git commit -m "카테고리: 신규 4종 색 토큰(3블록) + 카드 규칙, pa11y 대비 검증"
```

---

### Task 3: OG 이미지 4장

**Files:**
- Modify: `scripts/make-og.py`
- Create: `public/og/{electronics,health,food-travel,gaming}.png`

- [ ] **Step 1: `make-og.py` 의 CARDS 에 4개 추가**

기존 CARDS 딕셔너리 형태(색·이름·문구)를 따라 4개 추가. 색은 Task 2 accent 와 일치.

- [ ] **Step 2: 실행해 PNG 생성**

```bash
python3 scripts/make-og.py
ls -la public/og/{electronics,health,food-travel,gaming}.png
```
Expected: 4장 생성(1200×630). (헤드리스 Chrome + sips 필요 — macOS 로컬. CI 아님)

- [ ] **Step 3: 커밋**

```bash
git add scripts/make-og.py public/og/
git commit -m "카테고리: 신규 4종 OG 이미지 생성"
```

---

### Task 4: 프롬프트 4종

**Files:**
- Create: `.github/prompts/{electronics,health,food-travel,gaming}.md`

- [ ] **Step 1: 기존 프롬프트를 템플릿으로 4개 작성**

`# 출력`·`# 금지` 섹션은 기존 `.github/prompts/it-ai.md` 와 **바이트 동일**하게 복사(인라인 각주·출처 정확성 포함). `# 역할`·`# 리서치` 만 도메인에 맞게:
- electronics: 한국 가전·모바일·반도체 신제품/리뷰/업계, 공식 발표·기술매체·리뷰 소스.
- health: 한국 의료·바이오·제약·건강정책, 공신력 매체·기관. "정보 제공, 의학적 조언 아님" 톤.
- food-travel: 한국 화제 맛집·여행지, 인스타·블로그·매체 트렌드 + 위치·운영정보 검증. 광고성·과장 금지.
- gaming: 온라인·모바일·콘솔 게임 출시·업데이트·이스포츠, 공식·게임매체 소스.

- [ ] **Step 2: 출력/금지 섹션 동일성 검증**

```bash
for c in electronics health food-travel gaming; do
  diff <(sed -n '/^# 출력/,$p' .github/prompts/it-ai.md) <(sed -n '/^# 출력/,$p' .github/prompts/$c.md) >/dev/null && echo "$c OK" || echo "$c DIFF";
done
```
Expected: 4개 모두 OK.

- [ ] **Step 3: 커밋**

```bash
git add .github/prompts/
git commit -m "카테고리: 신규 4종 생성 프롬프트"
```

---

### Task 5: generate.yml cron + 카테고리 매핑

**Files:**
- Modify: `.github/workflows/generate.yml`

- [ ] **Step 1: schedule cron 4줄 추가**

`on.schedule` 에 추가:
```yaml
    - cron: "20 0 * * 1-5"  # electronics
    - cron: "25 0 * * 1-5"  # health
    - cron: "30 0 * * 1-5"  # food-travel
    - cron: "35 0 * * 1-5"  # gaming
```

- [ ] **Step 2: `case "${{ github.event.schedule }}"` 매핑 4개 + 검증 case 4개 추가**

카테고리 해석 `case` 에:
```bash
            "20 0 * * 1-5") CATEGORY=electronics ;;
            "25 0 * * 1-5") CATEGORY=health ;;
            "30 0 * * 1-5") CATEGORY=food-travel ;;
            "35 0 * * 1-5") CATEGORY=gaming ;;
```
그리고 유효성 검증 `case` 의 허용 목록에 `electronics|health|food-travel|gaming` 추가.

- [ ] **Step 3: YAML 검증 + 커밋**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/generate.yml')); print('YAML OK')"
git add .github/workflows/generate.yml
git commit -m "CI: 신규 4종 cron + 카테고리 매핑"
```

---

### Task 6: 빈 상태 브라우저 확인 (컨트롤러)

구현자 커밋 후 컨트롤러가 브라우저로 확인: 홈·아카이브·신규 카테고리 목록(`/electronics/` 등)이
빈 상태에서 깨지지 않는지, 네비게이션(Header/Footer)에 7개가 뜨는지, 신규 칩 색이 정상인지.
(칩은 리포트가 있어야 렌더되므로, 필요하면 임시 draft 리포트로 색 확인.)

---

### Task 7: 롤아웃 (사용자/머지 후)

- main 반영 후 신규 4개 각각 `gh workflow run generate.yml -f category=<id> -f date=<오늘>` 로 첫 리포트 생성·검증(순차, 비용 감안).
- 첫 생성분으로 색·칩·RSS·홈 반영 최종 확인.

---

## Self-Review (spec 대조)

- 등록 6+지점 → Task 1(코드4)·2(색)·3(OG)·4(프롬프트)·5(cron). §2 매핑 완료.
- §3 색 3블록·대비 → Task 2 + pa11y 검증(Step 4). §5 프롬프트 동일성 → Task 4 Step 2. §6 OG → Task 3. §7 빈 컬렉션 → Task 1 Step 5-6 + Task 6. §8 검증 → 각 Task + Task 6·7.
- 제안 hex 는 검증 전제 값 — pa11y 미달 시 조정(Task 2 Step 4)이 명시됨.
- 알려진 위험: reports.ts AnyEntry·global.css .card 규칙·make-og CARDS 의 정확한 기존 형태는 구현자가 파일에서 확인해 동일 패턴 확장(플랜에 형태 참조 지시 포함).
