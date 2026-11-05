"""Regenerate the self-hosted Chinese subset; requires fonttools and brotli.

Download the upstream font listed in public/fonts/licenses/NotoSerifSC-SOURCE.md,
then run: python scripts/subset-chinese-font.py path/to/NotoSerifCJKsc-Regular.otf
"""
from pathlib import Path
import hashlib
import json
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
expected = '2a2eae2628df83556c54018c41e20fa532c1b862c5256ae8b3f23feb918d12ca'
if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
    raise SystemExit('Upstream font differs; review its version and licence before updating the checksum.')
characters = '中文切换语言切换为中文Switch to EnglishLanguageEN/0123456789 个项目'
for name in ['zh-CN.json', 'pool.zh-CN.json']:
    characters += ''.join(json.loads((root / 'src/data/locales' / name).read_text(encoding='utf8')).values())
font = TTFont(source)
missing = set(map(ord, characters)) - set(font.getBestCmap()) - {10, 13}
if missing:
    raise SystemExit(f'Upstream is missing glyphs: {missing}')
options = subset.Options()
options.flavor = 'woff2'
options.layout_features = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=characters)
subsetter.subset(font)
font.flavor = 'woff2'
target = root / 'public/fonts/noto-serif-sc.woff2'
font.save(target)
print(f'{len(set(characters))} characters → {target} ({target.stat().st_size} bytes)')
