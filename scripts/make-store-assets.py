#!/usr/bin/env python3
"""Google Play 스토어 자료 생성 (헤드리스 Chrome + sips) — 이미지 라이브러리 의존 없음.

- 피처 그래픽: 1024×500 브랜드 배너.
- 폰 스크린샷: 프로덕션 페이지를 360×640 @3x(=1080×1920, 9:16)로 캡처 → 모바일 레이아웃.
출력: store-assets/ (gitignore). 실행: python3 scripts/make-store-assets.py
"""
import os
import subprocess
import sys
import tempfile

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SITE = os.environ.get("SITE_URL", "https://ai-report-navy.vercel.app")
OUT = "store-assets"

FONT = "-apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"

FEATURE_HTML = f"""<!doctype html><html><body style="margin:0;font-family:{FONT}">
<div style="width:1024px;height:500px;background:#fcfcfb;display:flex;align-items:center;gap:46px;padding:0 92px;box-sizing:border-box">
  <div style="width:152px;height:152px;border-radius:34px;background:#2a78d6;display:flex;align-items:center;justify-content:center;flex:none">
    <svg width="94" height="94" viewBox="0 0 32 32">
      <path d="M8 21V11m0 10h5.5M8 16h4.5M18 21l3.5-10L25 21m-5.6-3h4.2" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
  </div>
  <div>
    <div style="font-size:66px;font-weight:800;letter-spacing:-2.5px;color:#0b0b0b;line-height:1">AI Report</div>
    <div style="font-size:28px;font-weight:600;color:#4d4d49;margin-top:14px">매일 아침, 열 개 주제 브리핑</div>
    <div style="font-size:20px;color:#6f6f69;margin-top:16px">검색 · 태그 · 주간 다이제스트 · 오프라인</div>
  </div>
</div></body></html>"""

PAGES = [
    ("/", "01-home"),
    ("/kr-daily/2026-09-02/", "02-report"),
    ("/archive/", "03-archive"),
    ("/weekly/", "04-weekly"),
]


def run(args):
    subprocess.run(args, check=True, capture_output=True)


def main():
    if not os.path.exists(CHROME):
        sys.exit(f"❌ Chrome 을 찾을 수 없습니다: {CHROME}")
    os.makedirs(OUT, exist_ok=True)

    # 1) 피처 그래픽 1024×500
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "feature.html")
        open(src, "w", encoding="utf-8").write(FEATURE_HTML)
        shot = os.path.join(OUT, "feature-graphic.png")
        run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
             "--force-device-scale-factor=1", "--window-size=1024,500",
             f"--screenshot={shot}", f"file://{src}"])
        run(["sips", "-z", "500", "1024", "-s", "format", "png", shot, "--out", shot])
        print(f"✅ {shot} (1024×500 피처 그래픽)")

    # 2) 폰 스크린샷 1400×2488 (700×1244 @2x, 모바일 레이아웃)
    #    헤드리스는 요청 창보다 ~30px 넓게 렌더해 좁은 창(≤430)에선 우측이 짤린다.
    #    700px 은 모바일 CSS(≤720) 범위이면서 여유가 있어 짤림 없이 깨끗하게 나온다.
    #    --headless=new 가 DPR·뷰포트를 정확히 반영. sips 리사이즈는 하지 않음(왜곡 방지).
    for path, name in PAGES:
        out = os.path.join(OUT, f"screenshot-{name}.png")
        run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
             "--force-device-scale-factor=2", "--window-size=700,1244",
             "--virtual-time-budget=4000",
             f"--screenshot={out}", SITE + path])
        w = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", out],
                           capture_output=True, text=True).stdout
        kb = os.path.getsize(out) // 1024
        print(f"✅ {out} ({SITE}{path}, {kb} KB) {' '.join(w.split()[-4:])}")


main()
