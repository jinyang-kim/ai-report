#!/usr/bin/env python3
"""
리포트 마크다운 1개를 GitHub 저장소에 커밋합니다. (Vercel 이 자동으로 재배포)

★ git 프로토콜을 씁니다 — GitHub REST API(`api.github.com/repos/*`)는 실행 환경의
  게이트웨이에서 차단되는 경우가 있어 신뢰할 수 없습니다. `git clone`/`git push` 는
  공개·비공개 저장소 모두에서 정상 동작합니다.

사용법:
    export GH_TOKEN=github_pat_xxx
    export GH_REPO=사용자명/저장소명
    python3 publish.py <카테고리> <YYYY-MM-DD> <로컬 md 파일>

예:
    python3 publish.py it-ai 2026-09-01 ./IT-AI-2026-09-01.md

카테고리: kr-daily | it-ai | global-ui-ux | electronics | health | food-travel | gaming | education | finance | mobility
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

CATEGORIES = {"kr-daily", "it-ai", "global-ui-ux", "electronics", "health", "food-travel", "gaming", "education", "finance", "mobility"}
BOT_NAME = "AI Report Bot"
BOT_MAIL = "ai-report-bot@users.noreply.github.com"
PUSH_RETRIES = 3


def die(msg: str, code: int = 1):
    print(f"❌ {msg}", file=sys.stderr)
    sys.exit(code)


def git(*args: str, cwd: str | None = None, check: bool = True):
    r = subprocess.run(
        ["git", *args], cwd=cwd, capture_output=True, text=True, timeout=180
    )
    if check and r.returncode != 0:
        die(f"git {' '.join(args[:2])} 실패:\n{(r.stderr or r.stdout).strip()[:600]}")
    return r


def validate(text: str, date: str):
    if not text.startswith("---"):
        die("프론트매터(---)로 시작하지 않습니다. docs/AUTHORING.md 규격을 확인하세요.")
    end = text.find("\n---", 3)
    if end == -1:
        die("프론트매터가 닫히지 않았습니다 (--- 가 한 번만 있습니다).")
    fm = text[3:end]
    for key in ("title", "date", "summary"):
        if not re.search(rf"^{key}:", fm, re.M):
            die(f"프론트매터에 필수 항목 '{key}' 이 없습니다.")
    m = re.search(r"^date:\s*['\"]?(\d{4}-\d{2}-\d{2})", fm, re.M)
    if not m:
        die("프론트매터의 date 가 YYYY-MM-DD 형식이 아닙니다.")
    if m.group(1) != date:
        die(f"프론트매터 date({m.group(1)}) 와 파일명 날짜({date}) 가 다릅니다.")


def main():
    if len(sys.argv) != 4:
        die(f"인자 3개가 필요합니다.\n{__doc__}")

    category, date, local_path = sys.argv[1], sys.argv[2], sys.argv[3]

    if category not in CATEGORIES:
        die(f"알 수 없는 카테고리 '{category}'. 가능한 값: {', '.join(sorted(CATEGORIES))}")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
        die(f"날짜는 YYYY-MM-DD 형식이어야 합니다 (받은 값: {date})")

    token = os.environ.get("GH_TOKEN")
    repo = os.environ.get("GH_REPO")
    if not token:
        die("환경변수 GH_TOKEN 이 없습니다.")
    if not repo or "/" not in repo:
        die("환경변수 GH_REPO 가 없거나 형식이 잘못됐습니다 (사용자명/저장소명).")

    try:
        text = open(local_path, encoding="utf-8").read()
    except OSError as e:
        die(f"파일을 읽을 수 없습니다: {e}")

    validate(text, date)

    remote = f"https://x-access-token:{token}@github.com/{repo}.git"
    safe_remote = f"https://github.com/{repo}.git"
    work = tempfile.mkdtemp(prefix="ai-report-")

    try:
        clone = subprocess.run(
            ["git", "clone", "--depth", "1", "--quiet", remote, "repo"],
            cwd=work, capture_output=True, text=True, timeout=300,
        )
        if clone.returncode != 0:
            err = (clone.stderr or "").replace(token, "***")
            hint = ""
            if "Authentication failed" in err or "could not read" in err:
                hint = "\n   → 토큰이 만료됐거나 Contents: Read and write 권한이 없습니다."
            elif "not found" in err.lower():
                hint = f"\n   → 저장소 {safe_remote} 를 찾을 수 없습니다. 이름과 토큰 접근 범위를 확인하세요."
            die(f"clone 실패:\n{err.strip()[:600]}{hint}")

        rp = os.path.join(work, "repo")
        rel = f"src/content/{category}/{date}.md"
        dest = os.path.join(rp, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        existed = os.path.exists(dest)
        shutil.copyfile(local_path, dest)

        git("add", "--", rel, cwd=rp)
        if not git("diff", "--cached", "--quiet", cwd=rp, check=False).returncode:
            print(f"ℹ️  내용이 기존과 동일합니다 — 커밋할 변경 없음 ({rel})")
            return

        verb = "update" if existed else "add"
        git(
            "-c", f"user.name={BOT_NAME}", "-c", f"user.email={BOT_MAIL}",
            "commit", "--quiet", "-m", f"{verb}: {category} 브리핑 {date}",
            cwd=rp,
        )

        # 다른 예약 작업이 먼저 푸시했을 수 있으므로 rebase 후 재시도합니다.
        for attempt in range(1, PUSH_RETRIES + 1):
            push = git("push", "--quiet", "origin", "HEAD", cwd=rp, check=False)
            if push.returncode == 0:
                sha = git("rev-parse", "--short", "HEAD", cwd=rp).stdout.strip()
                print(f"✅ 커밋 완료 — {rel} ({sha})")
                print(f"   https://github.com/{repo}/commit/{sha}")
                print("   Vercel 이 곧 자동으로 재배포합니다.")
                return
            if attempt == PUSH_RETRIES:
                err = (push.stderr or "").replace(token, "***")
                die(f"push 를 {PUSH_RETRIES}회 시도했으나 실패:\n{err.strip()[:600]}")
            print(f"⚠️  push 거부됨 (다른 작업이 먼저 올린 듯) — rebase 후 재시도 {attempt}/{PUSH_RETRIES - 1}")
            git("pull", "--rebase", "--quiet", "origin", "HEAD", cwd=rp)
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
