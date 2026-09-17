#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
lines = (ROOT / "AstroTemps_AutoProcessing_Tool.js").read_text(encoding="utf-8").splitlines()
func_re = re.compile(r"^\s*function\s+([A-Za-z0-9_]+)\s*\(")
wanted = {
    "executeFindBackground",
    "executeBackgroundNeutralizationFromBackground",
    "executeNoiseX",
    "executeSASproDenoise",
    "executeLukeHTStretch",
    "executeDarkStructureEnhance",
    "TAPSTAR_processSetiStarStretch",
    "executeScreenStars",
}
out=[]
for i,line in enumerate(lines):
    m=func_re.search(line)
    if not m or m.group(1) not in wanted:
        continue
    name=m.group(1)
    out.append(f"===== {name} line {i+1} =====")
    depth=0
    started=False
    for j in range(i, len(lines)):
        l=lines[j]
        out.append(f"{j+1:06d}: {l}")
        # crude but sufficient for function blocks in this file
        depth += l.count("{") - l.count("}")
        if "{" in l:
            started=True
        if started and depth <= 0 and j > i:
            break
    out.append("")
(ROOT/"tools"/"redux_task6_helpers.txt").write_text("\n".join(out),encoding="utf-8")
print("Wrote task6 helper extract")
