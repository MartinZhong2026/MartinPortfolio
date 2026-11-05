# Noto Serif SC

Self-hosted regular-weight subset of Noto Serif CJK SC, version 2.003, by the
Noto project (Google / Adobe), distributed under the SIL Open Font License 1.1.
See `NotoSerifSC-OFL.txt`; upstream copyright and licence metadata remain embedded.

Source downloaded 5 November 2026:
https://github.com/notofonts/noto-cjk/blob/main/Serif/OTF/SimplifiedChinese/NotoSerifCJKsc-Regular.otf

Original SHA-256:
`2a2eae2628df83556c54018c41e20fa532c1b862c5256ae8b3f23feb918d12ca`

The subset contains the characters in both Chinese catalogs and the language
controls. To update it, install `fonttools` and `brotli`, download the original,
and run `python scripts/subset-chinese-font.py path/to/NotoSerifCJKsc-Regular.otf`.
No external font service or package runs in the website.
