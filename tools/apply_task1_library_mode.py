#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "AstroTemps_AutoProcessing_Tool.js"
text = SOURCE.read_text(encoding="utf-8")

feature_old = (
    "#feature-id Utilities > AstroTemps AutoProcessing Tool\n"
    "#feature-info AstroTemps AutoProcessing Tool v1.2.0.<br/>Windows build for PixInsight 1.9.4+ with embedded ImageSolver V8, native SPCC, RC-Astro/SASpro engines, GraXpert integration, StarNet2, interactive NBN, Lighthouse, and interactive Star Stretch.\n"
)
feature_new = (
    "#ifndef ASTROTEMPS_LIBRARY_MODE\n"
    + feature_old +
    "#endif\n"
)

if "#ifndef ASTROTEMPS_LIBRARY_MODE\n#feature-id Utilities > AstroTemps AutoProcessing Tool" not in text:
    if text.count(feature_old) != 1:
        raise SystemExit(f"Feature registration anchor count != 1: {text.count(feature_old)}")
    text = text.replace(feature_old, feature_new, 1)

main_guard = "#ifndef ASTROTEMPS_LIBRARY_MODE\nmain();\n#endif"
if main_guard not in text:
    pos = text.rfind("\nmain();")
    if pos < 0:
        raise SystemExit("Could not find final main(); invocation")
    text = text[:pos] + "\n" + main_guard + text[pos + len("\nmain();"):]

SOURCE.write_text(text, encoding="utf-8", newline="\n")
print("Applied AstroTemps library-mode guards.")
