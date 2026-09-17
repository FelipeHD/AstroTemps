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

for marker in (
    "function TAPR_createStageCheckpoint",
    "function TAPR_restoreStageCheckpoint",
    "function TAPR_closeStageCheckpoint",
    "function TAPR_runWithFallback",
    "function TAPR_runOpticalCorrection",
    "function TAPR_runGradientRemoval",
    "function TAPR_runSharpening",
    "BlurXTerminator - Correct Only",
    "Cosmic Clarity SASpro - Correct Only",
    "SetiAstro Automatic DBE - Subtract Only",
    "GraXpert - Subtract Only",
    "BlurXTerminator - Sharpening",
    "Cosmic Clarity SASpro - Sharpening",
):
    require(marker in REDUX, f"Missing Redux fallback contract: {marker}")

for setting in (
    "s.blurCorrectOverlap = 0.20",
    "s.adbeDivideFirst = false",
    "s.graxpertSmoothing = 0.000",
    "s.sharpenStars = 0.40",
    "s.sharpenAdjustStarHalos = 0.00",
    "s.sharpenAutoNonstellarPSF = true",
    "s.sharpenNonstellar = 0.60",
    "s.sharpenOverlap = 0.20",
    "s.ccSharpMode = \"Both\"",
    "s.ccSharpStellarAmount = 0.90",
    "s.ccSharpNonStellarStrength = 3.00",
    "s.ccSharpNonStellarAmount = 0.50",
):
    require(setting in REDUX, f"Missing Redux fixed setting: {setting}")

require("TAPR_restoreStageCheckpoint" in REDUX and "fallbackFn" in REDUX,
        "Redux fallback must restore checkpoint before fallback")

for marker in (
    "function TAPR_imageWindowIds",
    "function TAPR_findNewStarsView",
    "function TAPR_cleanupNewWindows",
    "function TAPR_runStarRemoval",
    "StarXTerminator - Star Removal",
    "StarNet2 - Star Removal",
    "_Redux_stars",
):
    require(marker in REDUX, f"Missing Redux star-removal contract: {marker}")

for setting in (
    "s.starOutputStars = true",
    "s.starUnscreen = false",
    "s.starOverlap = 0.20",
    "s.starnetMask = true",
    "s.starnetUnscreen = true",
    "s.starnetLinear = true",
    "s.starnetUpsample = false",
    "s.starnetHighlightProtection = true",
):
    require(setting in REDUX, f"Missing Redux star-removal setting: {setting}")

require("executeStarX" in REDUX and "executeStarNet2" in REDUX,
        "Redux star-removal engines are not wired")

for marker in (
    "function TAPR_runBackgroundNeutralization",
    "function TAPR_runNoiseReduction",
    "function TAPR_runLukeHTStretch",
    "function TAPR_applyColorSaturation",
    "function TAPR_runDarkStructureEnhance",
    "executeFindBackground( view, false )",
    "executeBackgroundNeutralizationFromBackground",
    "NoiseXTerminator - Noise Reduction",
    "Cosmic Clarity SASpro - Noise Reduction",
    "executeLukeHTStretch",
    "ColorSaturation.AkimaSubsplines",
    "executeDarkStructureEnhance",
):
    require(marker in REDUX, f"Missing Redux starless-processing contract: {marker}")

for setting in (
    "s.noiseColorSeparation = true",
    "s.noiseFrequencySeparation = true",
    "s.noiseHFIntensity = 0.25",
    "s.noiseHFColor = 0.50",
    "s.noiseLFIntensity = 0.10",
    "s.noiseLFColor = 0.25",
    "s.noiseFrequencyScale = 3.0",
    "s.noiseIterations = 2",
    "s.noiseOverlap = 0.20",
    "s.ccNoiseLuma = 0.50",
    "s.ccNoiseColor = 0.50",
    "s.ccNoiseMode = \"full\"",
    "s.ccNoiseModel = \"Standard\"",
    "s.dseLayers = 8",
    "s.dseExtractMask = false",
    "s.dseScalingFunction = 1",
    "s.dseAmount = 0.30",
    "s.dseIterations = 1",
):
    require(setting in REDUX, f"Missing Redux starless fixed setting: {setting}")

require("s.spcc = !!spccCompleted" in REDUX,
        "Redux Luke HT mode is not driven by SPCC completion state")
require("[0.00000, 0.20000]" in REDUX and "[1.00000, 0.20000]" in REDUX,
        "Redux ColorSaturation curve is not fixed to +0.20")

print("PASS - Redux static contract")
