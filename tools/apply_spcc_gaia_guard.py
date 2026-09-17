#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "AstroTemps_AutoProcessing_Tool.js"
raw = SOURCE.read_bytes()
text = raw.decode("utf-8")
nl = "\r\n" if "\r\n" in text else "\n"


def lines(block: str) -> str:
    return block.replace("\n", nl)


def replace_once(old: str, new: str, label: str) -> None:
    global text
    old = lines(old)
    new = lines(new)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    text = text.replace(old, new, 1)


insert_anchor = """function executeSPCC( view, s )
{
"""
helpers = """function TAP_isGaiaDR3SPFailureText( text )
{
   var t = ( text === undefined || text === null ) ? "" : String( text ).toLowerCase();
   return t.indexOf( "gaia dr3/sp" ) >= 0 ||
          t.indexOf( "gaiadr3sp" ) >= 0 ||
          t.indexOf( "gaia dr3sp" ) >= 0 ||
          ( t.indexOf( "xpsd" ) >= 0 &&
            ( t.indexOf( "database" ) >= 0 || t.indexOf( "server" ) >= 0 ) ) ||
          t.indexOf( "spectrum wavelength table" ) >= 0;
}

function TAP_handleSPCCFailure( errorText )
{
   var details = ( errorText === undefined || errorText === null ) ? "" : String( errorText );
   var identifiedGaiaError = TAP_isGaiaDR3SPFailureText( details );

   console.criticalln( "SPCC did not complete." );
   if ( identifiedGaiaError )
      console.criticalln( "Detected a Gaia DR3/SP / XPSD catalog error: " + details );
   else
      console.warningln( "SPCC returned failure without a usable exception message. Check the Process Console for the native SPCC error." );

   var message =
      "<p><b>SPCC could not complete.</b></p>" +
      ( identifiedGaiaError ?
         "<p>The error reported by SPCC points to the <b>Gaia DR3/SP</b> spectrophotometric catalog or its XPSD configuration.</p>" :
         "<p>PixInsight did not return a detailed SPCC exception to AstroTemps. If the Process Console shows <b>Database files not available for the Gaia DR3/SP catalog</b> or an <b>XPSD server</b> error, use the steps below. If the console shows a different error, choose <b>Abort</b> and investigate that message instead.</p>" ) +
      "<p><b>Gaia DR3 and Gaia DR3/SP are different databases:</b><br/>" +
      "Gaia DR3 is used for astrometric solving; Gaia DR3/SP is required by SPCC.</p>" +
      "<p>Open the <b>Gaia</b> process in PixInsight, open its Preferences, select the <b>Gaia DR3/SP</b> data release, and configure either the complete Small Set or the complete Full Set of DR3/SP database files. Apply/save the Gaia preferences, then run SPCC again.</p>" +
      "<p><b>Ignore</b> = skip SPCC and continue the AstroTemps workflow.<br/>" +
      "<b>Abort</b> = stop processing so you can fix the catalog configuration.</p>";

   var answer = ( new MessageBox(
      message,
      "AstroTemps - SPCC / Gaia DR3/SP",
      StdIcon_Error,
      StdButton_Abort,
      StdButton_Ignore
   ) ).execute();

   if ( answer == StdButton_Ignore )
   {
      console.warningln( "SPCC skipped by user after a Gaia DR3/SP / unclassified native SPCC failure." );
      return false;
   }

   throw new Error(
      identifiedGaiaError ?
         "SPCC aborted: Gaia DR3/SP catalog or XPSD server is not correctly configured." :
         "SPCC aborted after native process failure. Check the Process Console for details."
   );
}

function executeSPCC( view, s )
{
"""
replace_once(insert_anchor, helpers, "insert SPCC helpers")

old_execute = """   view.window.bringToFront();
   CoreApplication.processEvents();

   if ( !P.executeOn( view ) )
      throw new Error( "SPCC failed or was aborted." );

   P = null;
   TAP_collectGarbage( "after direct V8 SPCC" );
   closeSPCCGraphWindows();
   view.window.bringToFront();
   CoreApplication.processEvents();
   console.noteln( "SPCC completed through native V8 binding." );
}
"""
new_execute = """   view.window.bringToFront();
   CoreApplication.processEvents();

   var spccCompleted = false;
   var spccErrorText = "";
   try
   {
      spccCompleted = P.executeOn( view );
   }
   catch ( eSPCC )
   {
      spccErrorText = TAP_errorText( eSPCC );
   }

   if ( !spccCompleted )
   {
      P = null;
      TAP_collectGarbage( "after failed direct V8 SPCC" );
      closeSPCCGraphWindows();
      view.window.bringToFront();
      CoreApplication.processEvents();

      if ( spccErrorText.length == 0 || TAP_isGaiaDR3SPFailureText( spccErrorText ) )
         return TAP_handleSPCCFailure( spccErrorText );

      throw new Error( "SPCC failed: " + spccErrorText );
   }

   P = null;
   TAP_collectGarbage( "after direct V8 SPCC" );
   closeSPCCGraphWindows();
   view.window.bringToFront();
   CoreApplication.processEvents();
   console.noteln( "SPCC completed through native V8 binding." );
   return true;
}
"""
replace_once(old_execute, new_execute, "replace SPCC execution tail")

old_dispatch = """   case "spcc":
      executeSPCC( workView, s );
      if ( s.autoSTF ) applyAutoSTF( workView, true );
      createProcessSnapshotIfEnabled( workView, s, "SPCC" );
      break;
"""
new_dispatch = """   case "spcc":
      var spccCompleted = executeSPCC( workView, s );
      if ( spccCompleted )
      {
         if ( s.autoSTF ) applyAutoSTF( workView, true );
         createProcessSnapshotIfEnabled( workView, s, "SPCC" );
      }
      else
         console.warningln( "SPCC stage skipped. Continuing with the remaining selected stages." );
      break;
"""
replace_once(old_dispatch, new_dispatch, "update SPCC dispatcher")

SOURCE.write_bytes(text.encode("utf-8"))
print("Applied SPCC Gaia DR3/SP failure handling patch.")
