"""프로젝트 공유 폴더의 초상화 원본(PNG 832x1216)을 게임용 WebP(폭 512)로 줄인다.

사용: python3 scripts/convert-portraits.py <원본 폴더> [출력 폴더=public/portraits]
원본은 저장소에 넣지 않는다(장당 1.5MB). 시드·프롬프트는 원본 폴더의 manifest.json에 있다.
"""
import sys
from pathlib import Path
from PIL import Image

src = Path(sys.argv[1])
out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / 'public/portraits'
out.mkdir(parents=True, exist_ok=True)
WIDTH, QUALITY = 512, 80
total = 0
for png in sorted(src.glob('u_*.png')):
    with Image.open(png) as im:
        im = im.convert('RGB')
        h = round(im.height * WIDTH / im.width)
        im = im.resize((WIDTH, h), Image.LANCZOS)
        dest = out / f'{png.stem}.webp'
        im.save(dest, 'WEBP', quality=QUALITY, method=6)
        total += dest.stat().st_size
print(f'{len(list(out.glob("u_*.webp")))}장, 합계 {total / 1024 / 1024:.1f}MB → {out}')
