#!/usr/bin/env python3
"""리포트 생성 품질 게이트 — zod(프론트매터 스키마)가 보지 않는 항목을 검사한다.

zod 는 highlights/sources 에 최소 개수를 강제하지 않고(default []) 본문도 보지 않는다.
이 스크립트는 생성이 사실상 실패했거나 지침을 안 지킨 경우를 잡아 커밋을 막는다.

사용:  python3 scripts/quality-check.py <path/to/report.md>
FAIL(exit 1): 오늘의 핵심 < 3, 출처 < 3, title 빈값, summary < 20자, 본문 < 600자.
WARN(exit 0): 본문 < 1200자(다소 짧음), 같은 카테고리 직전 리포트와 본문 동일(중복 의심).
의존성 없음(표준 라이브러리만).
"""
import glob
import os
import re
import sys

MIN_HIGHLIGHTS = 3
MIN_SOURCES = 3
MIN_SUMMARY = 20
MIN_BODY = 600
SHORT_BODY = 1200


def strip_md(body: str) -> str:
    body = re.sub(r"```.*?```", " ", body, flags=re.S)  # 코드블록
    body = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", body)  # 링크·이미지 → 표시 텍스트
    body = re.sub(r"[#>*`~|_\-]", "", body)  # 마크다운 기호
    return re.sub(r"\s+", "", body)


def field(fm: str, key: str) -> str:
    m = re.search(rf'^{re.escape(key)}:\s*"?(.*?)"?\s*$', fm, re.M)
    return m.group(1) if m else ""


def count_items(fm: str, key: str) -> int:
    """`key:` 블록 안의 최상위 `- ` 항목 수 (다음 최상위 키 전까지)."""
    n = 0
    inblock = False
    for ln in fm.split("\n"):
        if re.match(rf"^{re.escape(key)}:", ln):
            inblock = True
            continue
        if inblock:
            if re.match(r"^\S.*:", ln):  # 다음 최상위 키
                break
            if re.match(r"^\s*-\s", ln):
                n += 1
    return n


def main() -> None:
    if len(sys.argv) < 2:
        print("사용: python3 scripts/quality-check.py <report.md>")
        sys.exit(2)
    path = sys.argv[1]
    text = open(path, encoding="utf-8").read()
    parts = text.split("---", 2)
    if len(parts) < 3:
        print(f"✗ 프론트매터 구분자(---)가 없음: {path}")
        sys.exit(1)
    fm, body = parts[1], parts[2]

    fails, warns = [], []

    hl = count_items(fm, "highlights")
    if hl < MIN_HIGHLIGHTS:
        fails.append(f"오늘의 핵심 {hl}개 (>= {MIN_HIGHLIGHTS} 필요)")

    src = count_items(fm, "sources")
    if src < MIN_SOURCES:
        fails.append(f"출처 {src}개 (>= {MIN_SOURCES} 필요)")

    if not field(fm, "title").strip():
        fails.append("title 이 비어 있음")

    summ = field(fm, "summary").strip()
    if len(summ) < MIN_SUMMARY:
        fails.append(f"summary 가 너무 짧음 ({len(summ)}자)")

    blen = len(strip_md(body))
    if blen < MIN_BODY:
        fails.append(f"본문 {blen}자 (< {MIN_BODY} — 생성 실패 의심)")
    elif blen < SHORT_BODY:
        warns.append(f"본문 {blen}자 (다소 짧음)")

    # 같은 카테고리 직전 리포트와 본문이 완전히 동일하면 중복 의심 (경고)
    d, name = os.path.dirname(path), os.path.basename(path)
    prevs = sorted(g for g in glob.glob(os.path.join(d, "*.md")) if os.path.basename(g) < name)
    if prevs:
        prev = open(prevs[-1], encoding="utf-8").read().split("---", 2)
        if len(prev) >= 3 and strip_md(body) == strip_md(prev[2]):
            warns.append(f"직전 리포트({os.path.basename(prevs[-1])})와 본문 동일 — 중복 의심")

    for w in warns:
        print(f"⚠ {w}")
    if fails:
        for x in fails:
            print(f"✗ {x}")
        print(f"품질 게이트 실패: {path}")
        sys.exit(1)
    print(f"✓ 품질 게이트 통과 — 본문 {blen}자, 핵심 {hl}, 출처 {src}")


main()
