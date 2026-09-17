#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
lines = (ROOT / "AstroTemps_AutoProcessing_Tool.js").read_text(encoding="utf-8").splitlines()
ranges = [
    (10680, 11080, "defaults-and-engine-settings"),
    (12480, 13530, "processing-helpers"),
    (6800, 7350, "background-starstretch"),
    (10000, 10700, "saspro-core"),
    (28250, 28780, "workflow-dispatch"),
]
out = []
for start, end, label in ranges:
    out.append(f"\n===== {label} lines {start}-{end} =====\n")
    for n in range(start, min(end, len(lines)) + 1):
        out.append(f"{n:06d}: {lines[n-1]}")
(ROOT / "tools" / "redux_source_slices.txt").write_text("\n".join(out), encoding="utf-8")
print("Wrote tools/redux_source_slices.txt")
