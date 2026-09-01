# 처음 세팅 — GitHub · Vercel · GitHub Actions

한 번만 하면 됩니다. 순서대로 15분 정도 걸립니다.

---

## 1. GitHub 저장소 만들기

개인 계정에 저장소를 만듭니다. 공개 사이트이므로 **Public** 을 권장합니다
(Private 이어도 Vercel 배포는 됩니다).

```bash
cd ~/Desktop/jin_front_project/ai_report

git init
git branch -M main
git add .
git commit -m "AI Report 아카이브 사이트 초기 커밋"

# GitHub 에서 빈 저장소를 먼저 만든 뒤 (README/gitignore 체크 해제)
git remote add origin https://github.com/jinyang-kim/ai-report.git
git push -u origin main
```

> GitHub CLI 가 있다면 한 줄로:
> `gh repo create ai-report --public --source=. --remote=origin --push`

---

## 2. Vercel 연결

1. [vercel.com/new](https://vercel.com/new) 에서 방금 만든 저장소를 Import
2. 설정은 **건드리지 마세요** — Vercel 이 Astro 를 자동으로 인식합니다
   - Framework Preset: `Astro`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Deploy** 클릭

배포가 끝나면 `https://<프로젝트명>.vercel.app` 주소가 나옵니다.

### 도메인 반영하기

RSS·사이트맵·canonical 링크에 실제 주소가 들어가야 합니다. 둘 중 하나를 하세요.

**(A) 환경변수** — Vercel 프로젝트 → Settings → Environment Variables

| Key | Value |
| --- | --- |
| `SITE_URL` | `https://<프로젝트명>.vercel.app` |

**(B) 코드에 직접** — `astro.config.mjs` 의 기본값을 바꾸고 커밋

추가로 `public/robots.txt` 의 Sitemap 주소도 같은 값으로 바꿔주세요.

---

## 3. GitHub Actions 리포트 생성 활성화

평일 아침 자동으로 리포트를 생성·발행하려면 GitHub Actions 워크플로를 켜야 합니다.
워크플로는 Claude Code(구독 OAuth)로 리서치와 마크다운을 작성하고, 커밋/푸시는 `GITHUB_TOKEN`으로
결정적으로 수행합니다.

### 단계

#### (a) GitHub Apps 설치

`github.com/apps/claude` 를 저장소에 설치합니다.
- Contents와 Issues 권한 필요
- 설치 후 자동으로 완료됨

#### (b) 로컬에서 구독 OAuth 토큰 발급

```bash
claude setup-token
```

> 출력된 장수명 OAuth 토큰을 복사해 아래 (c) 의 secret 에 넣습니다 (구독 계정 인증용).
> 토큰은 절대 공개하지 마세요 — 저장소·로그·커밋에 넣지 않기.

#### (c) 저장소 Secret 등록

GitHub 저장소 → Settings → Secrets and variables → **Actions**

| Name | Value |
| --- | --- |
| `CLAUDE_CODE_OAUTH_TOKEN` | 위 (b) 에서 발급받은 토큰 |

#### (d) 워크플로 활성화

```bash
gh workflow enable "Generate Reports"
```

> 현재 워크플로는 `disabled_manually` 상태입니다.
> secret 없이 켜면 평일 아침 인증 실패로 `cron-failure` 이슈가 자동 생성되어 쌓이므로,
> 반드시 secret을 등록한 뒤 켜세요.

#### (e) 선택: 워크플로 수동 실행으로 검증

Actions → "Generate Reports" → **Run workflow** → 카테고리·날짜 입력 → **Run**

> 더미 날짜로 한 번 실행해서 정상 동작을 확인할 수 있습니다.
> 워크플로 로그와 생성된 commit을 검토하세요.

---

## 폴백 · 수동 발행 경로

다음 방식은 이제 주 경로가 아니라, 손으로 리포트를 올리거나 GitHub Actions 외 환경에서
작업할 때 쓰는 폴백입니다.

### 로컬 예약 작업 (기존 방식)

`~/.claude/scheduled-tasks/ai-report-*` 세 개의 로컬 예약 작업은 계속 보존됩니다.
필요하면 각 작업 프롬프트(`SKILL.md`)를 편집해 커스터마이징할 수 있습니다.

> - 앱이 열려 있어야 실행됨
> - 로컬 git 자격증명 사용 (GH_TOKEN 불필요)
> - 스케줄: 평일 09:05 / 09:10 / 09:15 (KST)

### scripts/publish.py — 수동 발행

다른 환경(클라우드 등)에서 발행하거나 손으로 올릴 때 쓰는 도구입니다.

```bash
export GH_TOKEN="github_pat_..."
export GH_REPO="jinyang-kim/ai-report"

python3 scripts/publish.py <category> <YYYY-MM-DD> <파일>
```

**파인그레인드 토큰 발급** (선택사항, 로컬에서만 필요):

1. GitHub → Settings → Developer settings →
   **Personal access tokens → Fine-grained tokens** → *Generate new token*
2. 다음과 같이 설정합니다:

| 항목 | 값 |
| --- | --- |
| Token name | `ai-report-publisher` |
| Expiration | 90일 (만료 후 재발급) |
| Repository access | **Only select repositories** → `jinyang-kim/ai-report` 하나만 |
| Permissions → Repository permissions → **Contents** | **Read and write** |
| 그 외 모든 권한 | No access (기본값 그대로) |

3. 생성된 `github_pat_...` 토큰을 복사해 `GH_TOKEN` 환경변수로 설정합니다.

> - **git 프로토콜 사용** — GitHub REST API는 게이트웨이에서 차단될 수 있어 신뢰할 수 없습니다.
> - 커밋 전 검증: 카테고리 유효성, 날짜 형식, 필수 프론트매터, 날짜·파일명 일치
> - 같은 날짜 파일 존재 시 skip (멱등)

---

## 문제가 생기면

### GitHub Actions 워크플로

| 증상 | 원인 · 해결 |
| --- | --- |
| 워크플로가 `disabled` 상태 | `gh workflow enable "Generate Reports"` 로 활성화. secret을 먼저 등록했는지 확인 |
| 평일 아침 `cron-failure` 이슈가 계속 생성됨 | secret `CLAUDE_CODE_OAUTH_TOKEN`이 없거나 만료됨. 다시 등록 후 `gh workflow enable` 재실행 |
| Actions 로그에 "Authentication failed" | 1) OAuth 토큰 만료 → `claude setup-token` 다시 실행 후 secret 업데이트. 2) GitHub Apps 권한 부족 |
| 생성된 commit이 `main`에 안 보임 | 워크플로 로그 확인: 성공했는지, zod 검증 실패했는지 |

### 수동 발행 (publish.py)

| 증상 | 원인 · 해결 |
| --- | --- |
| `clone 실패 ... not found` | 저장소 이름 오타이거나 토큰의 Repository access 에 이 저장소가 없음 |
| `Authentication failed` / `Invalid username or token` | 토큰 만료, 또는 Contents 권한이 Read and write 가 아님 |
| `push 를 3회 시도했으나 실패` | 원격에 예상 못한 변경이 있음. 로컬에서 `git pull --rebase` 후 수동 확인 |

### 공통

| 증상 | 원인 · 해결 |
| --- | --- |
| Vercel 빌드 실패 | 대개 프론트매터 스키마 위반. 로컬에서 `npm run build` 로 재현하면 어느 파일인지 나옵니다 |
| 사이트는 되는데 RSS 주소가 이상함 | `SITE_URL` 환경변수 미설정 |
| 한글이 깨져 보임 | 마크다운 파일이 UTF-8 이 아님 (NFD 자모 분해). `python3 -c "import unicodedata,sys;..."` 로 NFC 정규화 |
