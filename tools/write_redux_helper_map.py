#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "AstroTemps_AutoProcessing_Tool.js").read_text(encoding="utf-8")
lines = source.splitlines()

wanted_terms = [
    "getDefaultSettings", "executeBlurXCorrect", "executeBlurXSharpen", "executeNoiseX",
    "executeStarX", "executeSPCC", "TAP_loadSPCCFilterNames", "runSetiAstroAutoDBE",
    "AutoDBE", "GraXpert", "runCosmicClarityViaSasproCLI", "StarNet2", "executeStarNet",
    "FindBackground", "Neutralize", "DarkStructure", "StarStretch", "Blend", "Screen",
    "hasAstrometric", "astrometric", "ImageSolver", "opticalEngine", "adbeEngine",
    "sharpenEngine", "noiseEngine", "starEngine", "starOutputStars", "starUnscreen",
    "noiseHF", "noiseLF", "ccSharp", "ccNoise", "starnet", "findBackground"
]

out = []
out.append("# TEMP Redux helper map\n")

# Function definitions matching broad terms
func_re = re.compile(r"^function\s+([A-Za-z0-9_]+)\s*\(")
matched = []
for i, line in enumerate(lines):
    m = func_re.search(line.strip())
    if not m:
        continue
    name = m.group(1)
    lname = name.lower()
    if any(term.lower() in lname for term in wanted_terms):
        matched.append((i, name))

out.append("## Functions\n")
for i, name in matched:
    out.append(f"### {name} @ line {i+1}\n")
    for j in range(i, min(len(lines), i+80)):
        if j > i and func_re.search(lines[j].strip()):
            break
        out.append(f"{j+1:06d}: {lines[j]}")
    out.append("")

out.append("## First-hit settings/markers\n")
for term in wanted_terms:
    hits = [i for i,l in enumerate(lines) if term.lower() in l.lower()]
    if not hits:
        continue
    i = hits[0]
    out.append(f"### {term} @ line {i+1}\n")
    for j in range(max(0,i-8), min(len(lines), i+28)):
        out.append(f"{j+1:06d}: {lines[j]}")
    out.append("")

(ROOT / "tools" / "redux_helper_map.txt").write_text("\n".join(out), encoding="utf-8")
print("Wrote tools/redux_helper_map.txt")
