#!/usr/bin/env python3
"""
리포트 마크다운 1개를 GitHub 저장소에 커밋합니다. (Vercel 이 자동으로 재배포)

클라우드 예약 실행 환경에는 데스크톱 브리지가 없고 git 도 설정돼 있지 않으므로,
clone 없이 GitHub Contents API 로 파일 하나만 PUT 합니다.
세 개의 예약 작업이 같은 아침에 각자 다른 경로를 쓰기 때문에 서로 충돌하지 않습니다.

사용법:
    export GH_TOKEN=github_pat_xxx
    export GH_REPO=사용자명/저장소명
    python3 publish.py <카테고리> <YYYY-MM-DD> <로컬 md 파일>

예:
    python3 publish.py it-ai 2026-09-01 ./IT-AI-2026-09-01.md

카테고리: kr-daily | it-ai | global-ui-ux
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request

CATEGORIES = {"kr-daily", "it-ai", "global-ui-ux"}
API = "https://api.github.com"


def die(msg: str, code: int = 1):
    print(f"❌ {msg}", file=sys.stderr)
    sys.exit(code)


def request(method: str, url: str, token: str, data: dict | None = None):
    req = urllib.request.Request(
        url,
        method=method,
        data=json.dumps(data).encode("utf-8") if data is not None else None,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "ai-report-publisher",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.load(res)


def main():
    if len(sys.argv) != 4:
        die(f"인자 3개가 필요합니다.\n{__doc__}")

    category, date, local_path = sys.argv[1], sys.argv[2], sys.argv[3]

    if category not in CATEGORIES:
        die(f"알 수 없는 카테고리 '{category}'. 가능한 값: {', '.join(sorted(CATEGORIES))}")

    if len(date) != 10 or date[4] != "-" or date[7] != "-":
        die(f"날짜는 YYYY-MM-DD 형식이어야 합니다 (받은 값: {date})")

    token = os.environ.get("GH_TOKEN")
    repo = os.environ.get("GH_REPO")
    if not token:
        die("환경변수 GH_TOKEN 이 없습니다.")
    if not repo or "/" not in repo:
        die("환경변수 GH_REPO 가 없거나 형식이 잘못됐습니다 (사용자명/저장소명).")

    try:
        raw = open(local_path, "rb").read()
    except OSError as e:
        die(f"파일을 읽을 수 없습니다: {e}")

    text = raw.decode("utf-8")
    if not text.startswith("---"):
        die("프론트매터(---)로 시작하지 않습니다. docs/AUTHORING.md 규격을 확인하세요.")
    for key in ("title:", "date:", "summary:"):
        if key not in text:
            die(f"프론트매터에 필수 항목 '{key.rstrip(':')}' 이 없습니다.")

    remote_path = f"src/content/{category}/{date}.md"
    url = f"{API}/repos/{repo}/contents/{remote_path}"

    # 같은 경로가 이미 있으면 덮어쓰기 위해 sha 가 필요합니다.
    sha = None
    try:
        sha = request("GET", url, token).get("sha")
    except urllib.error.HTTPError as e:
        if e.code != 404:
            die(f"기존 파일 조회 실패 ({e.code}): {e.read().decode('utf-8', 'replace')[:400]}")

    payload = {
        "message": f"{'update' if sha else 'add'}: {category} 브리핑 {date}",
        "content": base64.b64encode(raw).decode("ascii"),
    }
    if sha:
        payload["sha"] = sha

    try:
        res = request("PUT", url, token, payload)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:600]
        hint = ""
        if e.code == 404:
            hint = "\n   → 저장소 이름이 맞는지, 토큰이 이 저장소에 접근 권한이 있는지 확인하세요."
        elif e.code in (401, 403):
            hint = "\n   → 토큰이 만료됐거나 Contents: Read and write 권한이 없습니다."
        die(f"커밋 실패 ({e.code}): {body}{hint}")

    print(f"✅ 커밋 완료 — {remote_path}")
    print(f"   {res['commit']['html_url']}")
    print("   Vercel 이 곧 자동으로 재배포합니다.")


if __name__ == "__main__":
    main()
