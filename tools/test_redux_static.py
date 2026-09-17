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

require('#define ASTROTEMPS_LIBRARY_MODE' in REDUX, "Redux does not enable library mode")
require('#include "AstroTemps_AutoProcessing_Tool.js"' in REDUX, "Redux does not include the full processing library")
require('#feature-id Utilities > AstroTemps Redux' in REDUX, "Redux feature-id missing")
require("function TAPR_getTargetView" in REDUX, "Redux target resolver missing")
require("function TAPR_createReduxWorkingCopy" in REDUX, "Redux working-copy helper missing")
require("function TAPR_preflight" in REDUX, "Redux preflight missing")
require("Parameters.isViewTarget" in REDUX, "Process Icon/view-target path missing")
require("_Redux" in REDUX, "Redux working-copy suffix missing")
require("#engine v8" not in REDUX, "Redux must not declare a second #engine v8")

for marker in (
    "function TAPR_buildSPCCPresets",
    "function TAPR_showSPCCDialog",
    "function TAPR_runSolverAndSPCC",
    "Capture Filter",
    "Skip SPCC",
    "TAP_loadSPCCFilterNames",
    "reduxInstance",
    "newInstance",
):
    require(marker in REDUX, f"Missing Redux SPCC marker: {marker}")

require("Parameters.clear()" in REDUX, "Redux Process Icon must clear transient parameters")
require("spccRedFilter" in REDUX and "spccGreenFilter" in REDUX and "spccBlueFilter" in REDUX,
        "Redux preset must map to SPCC R/G/B filters")
require("if ( choice.skip )" in REDUX, "Redux SPCC skip branch missing")
require("executeSPCC" in REDUX, "Redux does not invoke proven SPCC implementation")

print("PASS - Redux static contract")
