#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "AstroTemps_Redux.js"
text = SOURCE.read_text(encoding="utf-8")

anchor = "\nfunction TAPR_main()\n{\n"
if anchor not in text:
    raise SystemExit("TAPR_main anchor not found")
if "function TAPR_runWorkflow" in text:
    raise SystemExit("Task 7 functions already present")

block = r'''
function TAPR_runStarStretch( starsView )
{
   if ( starsView == null || starsView.isNull )
      throw new Error( "Redux Star Stretch requires a valid stars-only image." );

   console.writeln( "<end><cbr><br>------------------------------------------------------------" );
   console.noteln( "[11] Star Stretch" );
   console.writeln( "Target             : " + starsView.id );
   console.writeln( "Stretch Amount     : 5.50" );
   console.writeln( "Color Boost Amount : 1.40" );
   console.writeln( "Remove Green SCNR  : ON" );

   starsView.window.bringToFront();
   TAPSTAR_applySCNR( starsView );
   TAPSTAR_applyStarStretch( starsView, 5.50, 1.40 );

   starsView.window.show();
   starsView.window.bringToFront();
   CoreApplication.processEvents();
   console.noteln( "Redux Star Stretch completed on " + starsView.id + "." );
   return starsView;
}

function TAPR_blendStarsIntoRedux( workView, starsView )
{
   if ( workView == null || workView.isNull || starsView == null || starsView.isNull )
      throw new Error( "Redux Blend Image + Stars requires valid starless and stars-only images." );

   console.writeln( "<end><cbr><br>------------------------------------------------------------" );
   console.noteln( "[12] Blend Image + Stars" );

   var tempResult = executeScreenStars( workView, starsView );
   if ( tempResult == null || tempResult.isNull )
      throw new Error( "Screen Blend did not return a valid final image." );

   if ( tempResult.image.width != workView.image.width ||
        tempResult.image.height != workView.image.height ||
        tempResult.image.numberOfChannels != workView.image.numberOfChannels )
   {
      try { tempResult.window.forceClose(); } catch ( eCloseMismatch ) {}
      throw new Error( "Screen Blend result geometry does not match the Redux working image." );
   }

   try
   {
      workView.beginProcess( UndoFlag_NoSwapFile );
      workView.image.assign( tempResult.image );
      workView.endProcess();
   }
   catch ( eAssign )
   {
      try { workView.endProcess(); } catch ( eEnd ) {}
      try { tempResult.window.forceClose(); } catch ( eClose ) {}
      throw eAssign;
   }

   try { tempResult.window.forceClose(); } catch ( eTempClose ) {}

   workView.window.show();
   workView.window.bringToFront();
   starsView.window.show();
   CoreApplication.processEvents();
   console.noteln( "Screen Blend copied into final Redux image: " + workView.id );
   return workView;
}

function TAPR_runWorkflow( workView, choice )
{
   TAPR_runOpticalCorrection( workView );
   TAPR_runGradientRemoval( workView );

   var spccCompleted = TAPR_runSolverAndSPCC( workView, choice );

   TAPR_runSharpening( workView );
   var starsView = TAPR_runStarRemoval( workView );

   TAPR_runBackgroundNeutralization( workView );
   TAPR_runNoiseReduction( workView );
   TAPR_runLukeHTStretch( workView, spccCompleted );
   TAPR_applyColorSaturation( workView );
   TAPR_runDarkStructureEnhance( workView );

   TAPR_runStarStretch( starsView );
   TAPR_blendStarsIntoRedux( workView, starsView );

   workView.window.show();
   workView.window.bringToFront();
   starsView.window.show();
   CoreApplication.processEvents();

   console.writeln( "<end><cbr><br>============================================================" );
   console.noteln( "AstroTemps Redux completed successfully." );
   console.noteln( "Final image : " + workView.id );
   console.noteln( "Stars image : " + starsView.id );
   console.writeln( "============================================================" );

   return {
      workView: workView,
      starsView: starsView,
      spccCompleted: spccCompleted
   };
}
'''

text = text.replace(anchor, "\n" + block + anchor, 1)

old = '''      // Processing stages are wired into the final orchestration after all
      // stage helpers have been implemented and regression-tested.
'''
new = '''      var result = TAPR_runWorkflow( workView, choice );
      result.workView.window.bringToFront();
'''
if old not in text:
    raise SystemExit("Main orchestration placeholder not found")
text = text.replace(old, new, 1)

SOURCE.write_text(text, encoding="utf-8", newline="\n")
print("Applied Redux Task 7 final workflow implementation.")
