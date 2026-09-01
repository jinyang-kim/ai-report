# 마크다운 작성 규격

GitHub Actions가 생성하는 리포트는 이 규격을 지켜야 합니다.
어긋나면 Vercel 빌드가 실패하고 사이트가 갱신되지 않습니다.

---

## 파일 경로와 이름

```
src/content/<카테고리>/<YYYY-MM-DD>.md
```

| 카테고리 폴더 | 브리핑 |
| --- | --- |
| `kr-daily` | 한국 데일리 브리핑 (증시·IT·정치·날씨) |
| `it-ai` | IT·AI 심층 스크랩 |
| `global-ui-ux` | 글로벌 UI·UX 브리핑 |

- 파일명이 곧 URL 이 됩니다 → `/it-ai/2026-09-01/`
- 날짜는 **KST 기준 발행일**. `TZ=Asia/Seoul date '+%Y-%m-%d'` 로 확인하세요.
- 같은 날 두 번 발행할 일이 생기면 `2026-09-01-2.md` 처럼 접미사를 붙입니다.

---

## 프론트매터

```yaml
---
title: "IT·AI 심층 스크랩 — 2026년 9월 1일"
date: 2026-09-01
summary: "React 20 RC 공개와 Vite 8 정식 릴리스가 겹친 하루. 둘 다 프로덕션 도입 판단이 필요합니다."
highlights:
  - "React 20 RC — Server Components 안정화, 마이그레이션 경로는 아직 미정"
  - "Vite 8 정식 — Rolldown 기본 번들러 전환, 빌드 시간 단축"
  - "코스피 2,7xx 마감 (9월 1일 종가)"
tags: ["React", "Vite", "빌드 도구"]
alert: false
sources:
  - title: "React 20 RC 공식 블로그"
    url: "https://react.dev/blog/..."
  - title: "Vite 8 릴리스 노트"
    url: "https://vitejs.dev/blog/..."
---
```

| 필드 | 필수 | 타입 | 설명 |
| --- | --- | --- | --- |
| `title` | ✅ | 문자열 | 리포트 제목 |
| `date` | ✅ | `YYYY-MM-DD` | KST 발행일. 파일명과 같아야 합니다 |
| `summary` | ✅ | 문자열 | 목록 카드에 노출. 2~3문장, 줄바꿈 없이 |
| `highlights` | | 문자열 배열 | "오늘의 핵심" 3가지. 카드와 상세 상단 콜아웃에 표시 |
| `tags` | | 문자열 배열 | 검색 대상에 포함됩니다 |
| `alert` | | 불리언 | `true` 면 🔔 조치 필요 배지. 기본 `false` |
| `sources` | | `{title, url}` 배열 | 본문 하단 출처 목록. `url` 은 유효한 절대 URL이어야 합니다 |
| `draft` | | 불리언 | `true` 면 빌드에서 제외 |
| `schemaVersion` | | 문자열 | 스키마 버전. 기본값 `"1.0"`. 마이그레이션 추적용. 생성 워크플로가 자동으로 채우며, 손으로 쓸 땐 비워도 빌드 통과(하위호환) |
| `generatedAt` | | 문자열 (ISO 8601) | 생성 시각. 예: `"2026-08-31T09:00:00+09:00"`. 선택사항. 생성 워크플로가 자동으로 채웁니다 |
| `generatedBy` | | 문자열 | 생성 주체. `"manual"` 또는 `"claude-code"`. 선택사항. 생성 워크플로가 자동으로 채웁니다 |
| `sourceUrls` | | URL 문자열 배열 | 리서치에 사용한 원본 URL 목록 (`sources` 와 별개로 전체 추적용). 기본값 `[]`. 생성 워크플로가 자동으로 채우며, 손으로 쓸 땐 비워도 빌드 통과 |

### 자주 나는 오류

- **콜론이 든 제목은 따옴표로 감싸기** — `title: "Vite 8: 무엇이 바뀌었나"` (따옴표 없으면 YAML 파싱 실패)
- **`sources[].url` 은 반드시 `http(s)://` 로 시작** — 상대 경로는 스키마 검증에서 거부됩니다
- **`summary` 안에서 줄바꿈 금지** — 길면 한 줄로 이어 쓰세요
- **`summary` 앞 78자에 요점을 담기** — 이 값이 그대로 `<meta name="description">` 과
  og:description 이 됩니다. 구글 검색 결과는 한글 기준 약 78자에서 잘리므로, 뒤에 붙는
  문장은 검색 결과에 노출되지 않습니다. 목록 카드는 3줄로 잘리니 길이 자체는 자유입니다
- **`date` 에 따옴표를 쓰지 말 것** — `date: 2026-09-01` (따옴표 있어도 파싱되지만 통일)

---

## 본문

일반 마크다운입니다. 렌더링 시 다음이 적용됩니다.

- `##` 위에 구분선이 자동으로 들어갑니다 → 섹션 구분에 `##` 를 쓰세요
- 표는 가로 스크롤 컨테이너에 자동으로 담깁니다 (모바일에서 페이지가 밀리지 않음)
- 코드 블록은 Shiki 로 하이라이트되고 라이트/다크에 맞춰 전환됩니다 — 언어를 꼭 명시하세요
- 링크는 본문 안에 `[제목](URL)` 로 넣고, 핵심 출처는 프론트매터 `sources` 에도 넣습니다
- **`<h1>` 을 본문에 쓰지 마세요** — 제목은 프론트매터 `title` 이 담당합니다

```markdown
## 핵심 이슈

### React 20 RC 공개

무슨 일인지 한 문단, 왜 중요한지 한 문단, 배경과 맥락 한 문단,
프론트엔드 개발자 관점의 시사점 한 문단.

| 항목 | 값 | 출처 | 측정 시점 |
| --- | --- | --- | --- |
| ... | ... | ... | ... |

```vue
<script setup lang="ts">
// 짧고 정확한 예제
</script>
```
```

---

## 발행

### GitHub Actions (주 경로)

평일 아침 `.github/workflows/generate.yml` 이 카테고리별로 Claude Code Action 을 실행해 리포트를 생성합니다.
구독 사용이므로 API 과금이 없고, 클라우드에서 돌아 로컬 맥 의존이 없습니다.

| 스케줄 (cron · UTC) | KST | 카테고리 |
| --- | --- | --- |
| `5 0 * * 1-5` | 09:05 | kr-daily |
| `10 0 * * 1-5` | 09:10 | it-ai |
| `15 0 * * 1-5` | 09:15 | global-ui-ux |

**중요한 점:**
- **Claude 는 파일 Write 까지만 합니다.** 커밋과 푸시는 워크플로 스텝이 결정적으로 `GITHUB_TOKEN` 으로 수행합니다.
  (파인그레인드 PAT 불필요)
- 검증 게이트는 `npm run build`(zod). 통과해야만 커밋합니다.
- 멱등성: 같은 날짜 파일이 있으면 skip 합니다.
- 실패 시 `cron-failure` 라벨 GitHub Issue 를 자동 생성합니다.

**가동 스위치 (현재 비활성)** — 워크플로는 `disabled_manually` 상태입니다.
켜려면 (사용자 자격증명 필요):

1. `github.com/apps/claude` 설치
2. `claude setup-token` 실행
3. repo secret `CLAUDE_CODE_OAUTH_TOKEN` 등록
4. `gh workflow enable "Generate Reports"` 로 활성화

### 수동/폴백 발행

로컬이나 다른 환경에서 발행할 때는 두 가지 방법이 있습니다.

#### Git 프로토콜을 쓰는 수동 발행

**git 프로토콜을 씁니다.** GitHub REST API(`api.github.com/repos/*`)는 실행 환경의 게이트웨이에서
차단되는 경우가 있어 신뢰할 수 없습니다. `git clone`/`git push` 는 공개·비공개 저장소 모두에서
정상 동작합니다.

```bash
export GH_TOKEN="github_pat_..."          # 파인그레인드 PAT, Contents: Read and write
export GH_REPO="jinyang-kim/ai-report"

CAT=it-ai                                  # kr-daily | it-ai | global-ui-ux
DATE=$(TZ=Asia/Seoul date +%F)
MD=./report.md                             # 방금 만든 마크다운

W=$(mktemp -d)
git clone --depth 1 --quiet "https://x-access-token:${GH_TOKEN}@github.com/${GH_REPO}.git" "$W/r"
mkdir -p "$W/r/src/content/$CAT"
cp "$MD" "$W/r/src/content/$CAT/$DATE.md"
cd "$W/r"
git add -A
git -c user.name="AI Report Bot" -c user.email="ai-report-bot@users.noreply.github.com" \
    commit -qm "add: $CAT 브리핑 $DATE"
git push -q origin HEAD \
  || { git pull --rebase -q origin HEAD && git push -q origin HEAD; }
echo "발행 완료"
```

마지막 줄의 `||` 는 **다른 작업이 먼저 push 한 경우**를 위한 재시도입니다.
세 작업이 각각 다른 파일을 쓰므로 rebase 는 항상 깨끗하게 통과합니다.

#### scripts/publish.py — 스크립트 검증 발행

로컬에서 수동으로 올릴 때는 저장소에 들어 있는 스크립트를 쓰는 편이 낫습니다 —
프론트매터 검증까지 해줍니다.

```bash
export GH_TOKEN="github_pat_..."
export GH_REPO="jinyang-kim/ai-report"
python3 scripts/publish.py it-ai 2026-09-01 ./IT-AI-2026-09-01.md
```

`scripts/publish.py` 가 커밋 전에 확인하는 것:

- 카테고리 이름이 유효한지
- 날짜가 `YYYY-MM-DD` 형식인지
- 프론트매터에 `title` / `date` / `summary` 가 있는지
- **프론트매터의 `date` 와 파일명 날짜가 일치하는지**
- 내용이 기존 파일과 같으면 빈 커밋을 만들지 않고 건너뜀

## 로컬 검증

커밋 전에 스키마를 확인하고 싶다면:

```bash
npm run build
```

프론트매터가 규격에 어긋나면 어느 파일의 어느 필드가 문제인지 정확히 알려줍니다.
