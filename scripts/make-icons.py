#!/usr/bin/env python3
"""PWA 앱 아이콘 생성 (헤드리스 Chrome + sips) — make-og.py 와 같은 방식, 이미지 라이브러리 의존 없음.

브랜드 마크(파란 #2a78d6 배경 + 흰 AI 마크)를 풀블리드 정사각형으로 렌더해
public/icons/ 에 512·192·180(apple-touch) PNG 를 만든다. 배경이 정사각형을 꽉 채워
maskable(런처가 원/스퀘어클로 잘라도 안전) + apple-touch(iOS 가 모서리 둥글림)에 모두 쓴다.
아이콘을 바꿀 때만 실행: python3 scripts/make-icons.py
"""
import os
import subprocess
import sys
import tempfile

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT = "public/icons"
BG = "#2a78d6"
# 2배 해상도로 렌더 → sips 로 축소. 마크는 maskable 안전영역(중앙 ~80%) 안에 들어오게 ~50%.
MARK = (
    "M8 21V11m0 10h5.5M8 16h4.5M18 21l3.5-10L25 21m-5.6-3h4.2"
)
HTML = f"""<!doctype html><html><body style="margin:0">
<div style="width:1024px;height:1024px;background:{BG};display:flex;align-items:center;justify-content:center">
<svg width="520" height="520" viewBox="0 0 32 32">
<path d="{MARK}" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg></div></body></html>"""


def main():
    if not os.path.exists(CHROME):
        sys.exit(f"❌ Chrome 을 찾을 수 없습니다: {CHROME}")
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "icon.html")
        shot = os.path.join(tmp, "icon.png")
        open(src, "w", encoding="utf-8").write(HTML)
        subprocess.run(
            [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
             "--force-device-scale-factor=1", "--window-size=1024,1024",
             f"--screenshot={shot}", f"file://{src}"],
            check=True, capture_output=True,
        )
        for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "icon-180.png")]:
            subprocess.run(
                ["sips", "-Z", str(size), "-s", "format", "png", shot, "--out", os.path.join(OUT, name)],
                check=True, capture_output=True,
            )
            kb = os.path.getsize(os.path.join(OUT, name)) // 1024
            print(f"✅ {OUT}/{name} ({size}px, {kb} KB)")


main()
