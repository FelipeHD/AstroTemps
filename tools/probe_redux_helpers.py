#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
text = (ROOT / "AstroTemps_AutoProcessing_Tool.js").read_text(encoding="utf-8")
lines = text.splitlines()
patterns = [
    r"^function\s+.*(?:Blur|SPCC|AutoDBE|GraX|SASpro|Cosmic|StarX|StarNet|NoiseX|Background|Stretch|Blend|DSE|DarkStructure|Solver|Astrometric|DefaultSettings|defaultSettings)",
    r"^function\s+getDefaultSettings",
    r"^function\s+TAP_.*(?:SPCC|Gaia|Star|Noise|Blur|Background|Solver)",
]
rx = re.compile("|".join(patterns), re.I)

print("=== MATCHING FUNCTION DEFINITIONS ===")
for i, line in enumerate(lines):
    if rx.search(line):
        print(f"\n--- line {i+1}: {line.strip()} ---")
        for j in range(i, min(len(lines), i+45)):
            print(f"{j+1:06d}: {lines[j]}")

print("\n=== SETTINGS KEYS / ENGINE MARKERS ===")
terms = [
    "opticalEngine", "adbeEngine", "sharpenEngine", "noiseEngine", "starEngine",
    "starOutputStars", "starUnscreen", "starOverlap", "noiseHF", "noiseLF",
    "findBackground", "neutralize", "darkStructure", "starStretch", "blend",
    "runCosmicClarityViaSasproCLI", "runGraXpert", "executeStarNet", "executeStarX",
    "executeNoiseX", "executeBlurX", "executeSPCC", "TAP_loadSPCCFilterNames",
]
for term in terms:
    hits = [i for i,l in enumerate(lines) if term.lower() in l.lower()]
    if hits:
        i = hits[0]
        print(f"\n### {term} first hit line {i+1}")
        for j in range(max(0,i-4), min(len(lines), i+14)):
            print(f"{j+1:06d}: {lines[j]}")
