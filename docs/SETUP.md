# 처음 세팅 — GitHub · Vercel · 예약 작업

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
git remote add origin https://github.com/<사용자명>/ai-report.git
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

## 3. GitHub 토큰 발급 (예약 작업용)

예약 작업이 매일 아침 리포트를 커밋하려면 토큰이 필요합니다.
**권한을 최소로 좁힌 파인그레인드 토큰**을 쓰세요.

1. GitHub → Settings → Developer settings →
   **Personal access tokens → Fine-grained tokens** → *Generate new token*
2. 다음과 같이 설정합니다:

| 항목 | 값 |
| --- | --- |
| Token name | `ai-report-publisher` |
| Expiration | 90일 (만료 후 재발급) |
| Repository access | **Only select repositories** → `ai-report` 하나만 |
| Permissions → Repository permissions → **Contents** | **Read and write** |
| 그 외 모든 권한 | No access (기본값 그대로) |

3. 생성된 `github_pat_...` 토큰을 복사합니다. **이 화면을 벗어나면 다시 볼 수 없습니다.**

> 이 토큰으로 할 수 있는 일은 `ai-report` 저장소의 파일을 읽고 쓰는 것뿐입니다.
> 다른 저장소, 계정 설정, 조직에는 접근할 수 없습니다.
> 만료일이 다가오면 새로 발급받아 예약 작업 3개의 토큰 값을 교체하세요.

---

## 4. 예약 작업에 토큰 넣기

토큰 값을 Claude 에게 전달하면 예약 작업 3개의 프롬프트에 넣어 드립니다.
직접 넣고 싶다면 각 작업 프롬프트의 아래 두 줄을 실제 값으로 바꾸면 됩니다.

```bash
export GH_TOKEN="github_pat_..."
export GH_REPO="<사용자명>/ai-report"
```

---

## 5. 동작 확인

토큰이 제대로 붙었는지 로컬에서 먼저 시험해볼 수 있습니다.

```bash
export GH_TOKEN="github_pat_..."
export GH_REPO="<사용자명>/ai-report"

# 아무 마크다운이나 하나 만들어서
python3 scripts/publish.py it-ai 2026-09-02 src/content/it-ai/2026-08-31.md
```

`✅ 커밋 완료` 가 뜨고 Vercel 에서 새 배포가 시작되면 성공입니다.
확인이 끝나면 시험용으로 올라간 파일은 GitHub 에서 지우세요.

---

## 문제가 생기면

| 증상 | 원인 · 해결 |
| --- | --- |
| `커밋 실패 (404)` | 저장소 이름 오타이거나 토큰의 Repository access 에 이 저장소가 없음 |
| `커밋 실패 (401/403)` | 토큰 만료, 또는 Contents 권한이 Read and write 가 아님 |
| Vercel 빌드 실패 | 대개 프론트매터 스키마 위반. 로컬에서 `npm run build` 로 재현하면 어느 파일인지 나옵니다 |
| 사이트는 되는데 RSS 주소가 이상함 | `SITE_URL` 환경변수 미설정 |
| 한글이 깨져 보임 | 마크다운 파일이 UTF-8 이 아님 (NFD 자모 분해). `python3 -c "import unicodedata,sys;..."` 로 NFC 정규화 |
