#!/usr/bin/env python3
from pathlib import Path

# Regression for PixInsight V8: native Dialog must be subclassed with class/super().
ROOT = Path(__file__).resolve().parents[1]
REDUX = (ROOT / "AstroTemps_Redux.js").read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


uses_v8_subclass = (
    "var TAPR_SPCCDialog = class extends Dialog" in REDUX
    or "class TAPR_SPCCDialog extends Dialog" in REDUX
)
require(uses_v8_subclass, "Redux SPCC dialog must subclass Dialog with V8 class syntax")
require("super();" in REDUX, "Redux SPCC dialog must initialize Dialog with super()")
require("this.__base__ = Dialog" not in REDUX,
        "Redux SPCC dialog still invokes the Dialog class as a legacy function")
require("TAPR_SPCCDialog.prototype = new Dialog" not in REDUX,
        "Redux SPCC dialog still uses legacy prototype construction")

print("PASS - Redux V8 Dialog construction")
