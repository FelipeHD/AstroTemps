#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "AstroTemps_AutoProcessing_Tool.js"
text = SOURCE.read_text(encoding="utf-8", errors="strict")

checks = {
    "Gaia/SP failure classifier": "function TAP_isGaiaDR3SPFailureText" in text,
    "SPCC failure handler": "function TAP_handleSPCCFailure" in text,
    "Gaia DR3/SP guidance": "Gaia DR3/SP" in text and "Open the <b>Gaia</b> process" in text,
    "Skip option": "StdButton_Ignore" in text and "return false;" in text,
    "Abort option": "StdButton_Abort" in text,
    "Native SPCC failure is caught": "catch ( eSPCC )" in text and "spccErrorText = TAP_errorText( eSPCC );" in text,
    "Unclassified false result gets guarded guidance": "spccErrorText.length == 0 || TAP_isGaiaDR3SPFailureText( spccErrorText )" in text,
    "SPCC success is explicit": "console.noteln( \"SPCC completed through native V8 binding.\" );\n   return true;" in text,
    "Dispatcher respects skipped SPCC": "var spccCompleted = executeSPCC( workView, s );" in text,
    "SPCC snapshot only on success": "if ( spccCompleted )" in text and "createProcessSnapshotIfEnabled( workView, s, \"SPCC\" );" in text,
    "Skip is logged": "SPCC stage skipped. Continuing with the remaining selected stages." in text,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL") + " - " + name)

if failed:
    raise SystemExit("SPCC Gaia guard missing requirements: " + ", ".join(failed))

print("All SPCC Gaia guard checks passed.")
