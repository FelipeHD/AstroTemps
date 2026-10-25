#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
full = (ROOT / "AstroTemps_AutoProcessing_Tool.js").read_text(encoding="utf-8")
redux = (ROOT / "AstroTemps_Redux.js").read_text(encoding="utf-8")

assert re.search(r'var\s+VERSION\s*=\s*["\']' + re.escape(version) + r'["\']', full)
assert re.search(r'var\s+REDUX_VERSION\s*=\s*["\']' + re.escape(version) + r'["\']', redux)

subprocess.run(["python3", "tools/build_update.py"], cwd=ROOT, check=True)
zip_path = ROOT / "updates" / f"AstroTemps-v{version}.zip"
with zipfile.ZipFile(zip_path) as zf:
    names = set(zf.namelist())

assert "src/scripts/AstroTemps/AstroTemps_AutoProcessing_Tool.js" in names
assert "src/scripts/AstroTemps/AstroTemps_Redux.js" in names
print("PASS - dual-script package")
