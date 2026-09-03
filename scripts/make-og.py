#!/usr/bin/env python3
"""
소셜 미리보기(OG) 이미지 4장을 public/og/ 에 생성합니다.

카테고리를 추가·변경했거나 브랜드 색·문구를 바꿨을 때만 다시 돌리면 됩니다.
결과 PNG 는 저장소에 커밋되므로 빌드·배포 과정에서는 실행되지 않습니다.

    python3 scripts/make-og.py

헤드리스 Chrome 으로 HTML 을 2배 해상도로 찍고 sips 로 1200x630 으로 줄입니다
(macOS 기본 도구만 사용 — 추가 의존성 없음).
"""
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_CSS = os.path.join(ROOT, 'public', 'fonts', 'pretendard', 'pretendard.css')
OUT_DIR = os.path.join(ROOT, 'public', 'og')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# src/lib/categories.ts 의 값과 맞춰 두세요.
CARDS = {
    'default': dict(title='매일 아침,<br>세 갈래의 브리핑', short=None,
                    desc='평일 아침마다 자동으로 생성되는 세 갈래 브리핑 아카이브',
                    accent='#2a78d6', chip=('#f3f3f0', '#4d4d49'), size=64),
    'kr-daily': dict(title='한국 데일리 브리핑', short='한국',
                     desc='증시 · IT 섹터 · 정치 · 날씨',
                     accent='#eb6834', chip=('#fdefe8', '#a8401a'), size=60),
    'it-ai': dict(title='IT·AI 심층 스크랩', short='IT·AI',
                  desc='프론트엔드 · AI · 빅테크 · 인프라',
                  accent='#2a78d6', chip=('#e9f1fc', '#1a5fae'), size=60),
    'global-ui-ux': dict(title='글로벌 UI·UX 브리핑', short='UI·UX',
                         desc='디자인 트렌드 · UX 사례 · 리서치 수치',
                         accent='#1baf7a', chip=('#e4f6ef', '#0d6d4b'), size=60),
    'electronics': dict(title='전자기기 브리핑', short='전자',
                        desc='가전·모바일·반도체·IT기기의 신제품과 리뷰',
                        accent='#0e9bb0', chip=('#ddf3f1', '#0d7a85'), size=60),
    'food-travel': dict(title='맛집·여행 브리핑', short='맛집',
                        desc='한국에서 화제인 맛집과 여행지 · 트렌드 정보',
                        accent='#d99019', chip=('#f6ead8', '#b5740f'), size=60),
    'gaming': dict(title='게임 브리핑', short='게임',
                   desc='온라인·모바일·콘솔 게임 · 이스포츠 · 업계 동향',
                   accent='#7c5cd6', chip=('#f0e8fa', '#5a3fa5'), size=60),
    'finance': dict(title='경제·재테크 브리핑', short='경제',
                    desc='금리·부동산·주식·코인 등 한국 경제와 재테크 흐름을 정리합니다.',
                    accent='#94810a', chip=('#f8f0d0', '#6b5d05'), size=60),
    'mobility': dict(title='자동차·모빌리티 브리핑', short='모빌리티',
                     desc='전기차·신차·자율주행 등 자동차와 모빌리티 산업 동향을 정리합니다.',
                     accent='#d64545', chip=('#f5e8e8', '#a83534'), size=60),
}

TPL = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="file://{font}">
<style>
  *{{margin:0;padding:0;box-sizing:border-box}}
  html,body{{width:1200px;height:630px;overflow:hidden}}
  body{{
    display:flex;flex-direction:column;justify-content:space-between;
    padding:72px 80px;background:#fcfcfb;
    font-family:'Pretendard Variable',-apple-system,'Apple SD Gothic Neo',sans-serif;
    color:#0b0b0b;letter-spacing:-0.03em;border-left:16px solid {accent};
  }}
  .top{{display:flex;align-items:center;gap:16px}}
  .mark{{width:44px;height:44px;border-radius:13px;
    background:linear-gradient(135deg,#2a78d6,#1baf7a 55%,#eb6834)}}
  .brand{{font-size:27px;font-weight:800;letter-spacing:-0.04em}}
  .chip{{margin-left:auto;padding:9px 20px;border-radius:999px;
    font-size:20px;font-weight:700;background:{chipbg};color:{chipfg}}}
  h1{{font-size:{size}px;font-weight:800;line-height:1.18;
    letter-spacing:-0.045em;max-width:16ch}}
  .desc{{margin-top:22px;font-size:28px;color:#4d4d49;
    font-weight:500;letter-spacing:-0.025em}}
  .foot{{display:flex;align-items:center;gap:14px;font-size:21px;
    color:#6f6f69;font-weight:600}}
  .dot{{width:8px;height:8px;border-radius:50%;background:{accent}}}
</style></head><body>
  <div class="top">
    <div class="mark"></div><div class="brand">AI Report</div>{chip}
  </div>
  <div><h1>{title}</h1><div class="desc">{desc}</div></div>
  <div class="foot"><span class="dot"></span>ai-report-navy.vercel.app</div>
</body></html>"""


def main():
    if not os.path.exists(CHROME):
        sys.exit(f"❌ Chrome 을 찾을 수 없습니다: {CHROME}")
    if not os.path.exists(FONT_CSS):
        sys.exit(f"❌ 폰트 CSS 가 없습니다: {FONT_CSS}")

    os.makedirs(OUT_DIR, exist_ok=True)
    work = tempfile.mkdtemp(prefix='ai-report-og-')
    try:
        for key, c in CARDS.items():
            chip_bg, chip_fg = c['chip']
            html = TPL.format(
                font=FONT_CSS, accent=c['accent'], chipbg=chip_bg, chipfg=chip_fg,
                size=c['size'], title=c['title'], desc=c['desc'],
                chip=f'<div class="chip">{c["short"]}</div>' if c['short'] else '',
            )
            src = os.path.join(work, f'{key}.html')
            shot = os.path.join(work, f'{key}@2x.png')
            dest = os.path.join(OUT_DIR, f'{key}.png')

            with open(src, 'w', encoding='utf-8') as f:
                f.write(html)

            subprocess.run(
                [CHROME, '--headless', '--disable-gpu', '--hide-scrollbars',
                 '--force-device-scale-factor=2', '--window-size=1200,630',
                 f'--screenshot={shot}', f'file://{src}'],
                capture_output=True, timeout=120,
            )
            if not os.path.exists(shot):
                sys.exit(f"❌ {key}: 스크린샷 생성 실패")

            subprocess.run(['sips', '-Z', '1200', '-s', 'format', 'png', shot,
                            '--out', dest], capture_output=True, timeout=60)
            print(f"✅ public/og/{key}.png ({os.path.getsize(dest) // 1024} KB)")
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main()
