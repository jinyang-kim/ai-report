#!/usr/bin/env python3
"""색 토큰 대비 게이트 — 라이트 + 다크(OS·수동) 3블록 모두 검사한다.

pa11y CI 는 라이트 모드만 렌더하므로 다크 모드 대비 회귀를 놓친다. 이 스크립트가
`src/styles/global.css` 의 카테고리 색 토큰을 3블록 전부 계산해 WCAG AA 임계를 강제한다.
토큰은 파일 안에서 light → OS다크 → 수동다크 순으로 3번 정의되므로 등장 순서로 블록을 구분한다.

임계(CLAUDE.md 규칙):  --cat-*-solid(흰 글자 배경) vs #fff >= 4.7,  --chip-*-fg vs --chip-*-bg >= 4.5.
사용:  python3 scripts/contrast-check.py    (의존성 없음)
"""
import re
import sys

CSS = "src/styles/global.css"
CATS = [
    "kr-daily", "it-ai", "global-ui-ux", "electronics", "health",
    "food-travel", "gaming", "education", "finance", "mobility",
]
MODES = ["light", "os-dark", "manual-dark"]
WHITE = "#ffffff"


def hx(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def lum(c):
    def f(x):
        return x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4
    r, g, b = (f(x) for x in c)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def cr(a, b):
    la, lb = lum(hx(a)), lum(hx(b))
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def vals(css, name):
    """토큰의 모든 정의를 파일 등장 순서로 (light, os-dark, manual-dark)."""
    return re.findall(rf"--{re.escape(name)}:\s*(#[0-9a-fA-F]{{6}})", css)


def main():
    css = open(CSS, encoding="utf-8").read()
    fails = []
    checked = 0
    for c in CATS:
        solids = vals(css, f"cat-{c}-solid")
        bgs = vals(css, f"chip-{c}-bg")
        fgs = vals(css, f"chip-{c}-fg")
        for i, mode in enumerate(MODES):
            if i < len(solids):
                r = cr(solids[i], WHITE)
                checked += 1
                if r < 4.7:
                    fails.append(f"[{mode}] --cat-{c}-solid {solids[i]} vs #fff = {r:.2f} (< 4.7)")
            if i < len(bgs) and i < len(fgs):
                r = cr(fgs[i], bgs[i])
                checked += 1
                if r < 4.5:
                    fails.append(f"[{mode}] --chip-{c} {fgs[i]}/{bgs[i]} = {r:.2f} (< 4.5)")
    if fails:
        for x in fails:
            print(f"✗ {x}")
        print(f"색 대비 게이트 실패 ({len(fails)}건)")
        sys.exit(1)
    print(f"✓ 색 대비 게이트 통과 — {checked}개 검사 (10 카테고리 × 라이트/다크)")


main()
