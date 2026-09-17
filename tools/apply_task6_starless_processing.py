#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "AstroTemps_Redux.js"
text = SOURCE.read_text(encoding="utf-8")

anchor = "\nfunction TAPR_main()\n{\n"
if anchor not in text:
    raise SystemExit("TAPR_main anchor not found")

block = r'''
function TAPR_runBackgroundNeutralization( view )
{
   console.writeln( "<end><cbr><br>------------------------------------------------------------" );
   console.noteln( "[6] Find and Neutralize Background" );
   var result = executeFindBackground( view, false );
   if ( result == null || result.success !== true || result.rect == null )
      throw new Error( "Find Background Full Image did not return a valid background region." );
   executeBackgroundNeutralizationFromBackground( view, result.rect );
}

function TAPR_runNoiseReduction( view )
{
   var s = defaultSettings();

   s.noiseColorSeparation = true;
   s.noiseFrequencySeparation = true;
   s.noiseHFIntensity = 0.25;
   s.noiseHFColor = 0.50;
   s.noiseLFIntensity = 0.10;
   s.noiseLFColor = 0.25;
   s.noiseFrequencyScale = 3.0;
   s.noiseIterations = 2;
   s.noiseOverlap = 0.20;

   s.ccNoiseLuma = 0.50;
   s.ccNoiseColor = 0.50;
   s.ccNoiseMode = "full";
   s.ccNoiseSeparateChannels = false;
   s.ccNoiseModel = "Standard";
   s.ccNoiseUseGPU = true;
   s.ccNoiseTempStretch = false;
   s.ccNoiseTargetMedian = 0.25;
   s.ccNoiseChunkSize = 256;
   s.ccNoiseOverlap = 64;

   TAPR_runWithFallback(
      "[7] Noise Reduction",
      view,
      "NoiseXTerminator - Noise Reduction",
      function() { executeNoiseX( view, s ); },
      "Cosmic Clarity SASpro - Noise Reduction",
      function() { executeSASproDenoise( view, s ); }
   );
}

function TAPR_runLukeHTStretch( view, spccCompleted )
{
   var s = defaultSettings();
   s.spcc = !!spccCompleted;
   console.noteln(
      "Redux stretch mode: " +
      ( s.spcc ? "LINKED (SPCC completed)" : "UNLINKED (SPCC skipped)" )
   );
   executeLukeHTStretch( view, s );
}

function TAPR_applyColorSaturation( view )
{
   console.writeln( "<end><cbr><br>------------------------------------------------------------" );
   console.noteln( "[9] Color Saturation" );

   var P = new ColorSaturation;
   P.HS = [
      [0.00000, 0.20000],
      [1.00000, 0.20000]
   ];
   P.HSt = ColorSaturation.AkimaSubsplines;
   P.hueShift = 0.000;

   view.window.bringToFront();
   if ( !P.executeOn( view ) )
      throw new Error( "Redux ColorSaturation execution failed or was aborted." );

   CoreApplication.processEvents();
   console.noteln( "ColorSaturation +0.20 completed." );
}

function TAPR_runDarkStructureEnhance( view )
{
   var s = defaultSettings();
   s.dseLayers = 8;
   s.dseExtractMask = false;
   s.dseScalingFunction = 1;
   s.dseAmount = 0.30;
   s.dseIterations = 1;
   executeDarkStructureEnhance( view, s );
}
'''

if "function TAPR_runBackgroundNeutralization" in text:
    raise SystemExit("Task 6 functions already present")
text = text.replace(anchor, "\n" + block + anchor, 1)
SOURCE.write_text(text, encoding="utf-8", newline="\n")
print("Applied Redux Task 6 starless-processing implementation.")
