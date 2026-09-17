#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
FULL = (ROOT / "AstroTemps_AutoProcessing_Tool.js").read_text(encoding="utf-8")
REDUX_PATH = ROOT / "AstroTemps_Redux.js"
REDUX = REDUX_PATH.read_text(encoding="utf-8") if REDUX_PATH.exists() else ""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


require("ASTROTEMPS_LIBRARY_MODE" in FULL, "Full script has no Redux library-mode guard")
require(re.search(r"#ifndef\s+ASTROTEMPS_LIBRARY_MODE[\s\S]*#feature-id", FULL) is not None,
        "Full feature registration is not guarded")
require(re.search(r"#ifndef\s+ASTROTEMPS_LIBRARY_MODE[\s\S]*\bmain\s*\(\s*\)\s*;", FULL) is not None,
        "Full main() invocation is not guarded")
print("PASS - full script library mode")
