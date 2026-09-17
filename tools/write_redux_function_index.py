#!/usr/bin/env python3
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
lines = (ROOT / "AstroTemps_AutoProcessing_Tool.js").read_text(encoding="utf-8").splitlines()
rx = re.compile(r"^\s*function\s+([A-Za-z0-9_]+)\s*\(")
out=[]
for i,line in enumerate(lines,1):
    m=rx.search(line)
    if m:
        out.append(f"{i:06d} {m.group(1)}")
(ROOT / "tools" / "redux_function_index.txt").write_text("\n".join(out)+"\n",encoding="utf-8")
print(f"Wrote {len(out)} functions")
