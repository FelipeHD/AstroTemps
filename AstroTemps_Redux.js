/*
 * =====================================================================
 * AstroTemps Redux
 * Version 1.2.0 - Windows
 * PixInsight / PJSR
 *
 * One-click opinionated workflow distributed alongside the full
 * AstroTemps AutoProcessing Tool. The full script is included in library
 * mode so Redux can reuse its proven processing engines without opening
 * the configurable AstroTemps interface.
 * =====================================================================
 */

#define ASTROTEMPS_LIBRARY_MODE
#include "AstroTemps_AutoProcessing_Tool.js"

#feature-id Utilities > AstroTemps Redux
#feature-info AstroTemps Redux v1.2.0.<br/>One-click opinionated processing workflow for PixInsight 1.9.4+.

var REDUX_VERSION = "1.2.0";
var TAPR_TITLE = "AstroTemps Redux";

function TAPR_getTargetView()
{
   if ( Parameters.isViewTarget && Parameters.targetView != null && !Parameters.targetView.isNull )
      return Parameters.targetView;

   if ( ImageWindow.activeWindow == null || ImageWindow.activeWindow.isNull )
      throw new Error( "AstroTemps Redux requires an active target image." );

   var view = ImageWindow.activeWindow.currentView;
   if ( view == null || view.isNull )
      throw new Error( "AstroTemps Redux could not resolve the active target view." );

   return view;
}

function TAPR_copyKeywords( sourceWindow, targetWindow )
{
   try
   {
      targetWindow.keywords = sourceWindow.keywords;
   }
   catch ( e )
   {
      console.warningln( "Redux: image keywords could not be copied: " + TAP_errorText( e ) );
   }
}

function TAPR_createReduxWorkingCopy( sourceView )
{
   if ( sourceView == null || sourceView.isNull )
      throw new Error( "Redux cannot create a working copy from an invalid view." );

   var src = sourceView.image;
   var id = uniqueImageId( sourceView.id + "_Redux" );
   var w = new ImageWindow(
      src.width,
      src.height,
      src.numberOfChannels,
      src.bitsPerSample,
      src.isReal,
      src.isColor,
      id
   );

   var ok = false;
   try
   {
      w.mainView.beginProcess( UndoFlag_NoSwapFile );
      w.mainView.image.assign( src );
      w.mainView.endProcess();

      TAPR_copyKeywords( sourceView.window, w );
      try { copyViewProperties( sourceView, w.mainView ); } catch ( eProps )
      {
         console.warningln( "Redux: view properties could not be copied: " + TAP_errorText( eProps ) );
      }

      w.show();
      w.mainView.window.bringToFront();
      CoreApplication.processEvents();
      ok = true;
      return w.mainView;
   }
   finally
   {
      if ( !ok )
      {
         try { w.forceClose(); } catch ( eClose ) {}
      }
   }
}

function TAPR_hasNativeProcess( name )
{
   switch ( name )
   {
   case "BlurXTerminator": return typeof BlurXTerminator != "undefined";
   case "NoiseXTerminator": return typeof NoiseXTerminator != "undefined";
   case "StarXTerminator": return typeof StarXTerminator != "undefined";
   case "StarNet2": return typeof StarNet2 != "undefined";
   case "SPCC": return typeof SpectrophotometricColorCalibration == "function";
   case "ColorSaturation": return typeof ColorSaturation != "undefined";
   case "PixelMath": return typeof PixelMath != "undefined";
   }
   return false;
}

function TAPR_preflight( targetView )
{
   if ( targetView == null || targetView.isNull )
      throw new Error( "AstroTemps Redux requires a valid target view." );

   try
   {
      if ( targetView.isPreview )
         throw new Error( "AstroTemps Redux must be executed on a main image, not on a preview." );
   }
   catch ( ePreview )
   {
      if ( String( ePreview ).indexOf( "main image" ) >= 0 )
         throw ePreview;
   }

   var image = targetView.image;
   if ( image == null || !image.isColor || image.numberOfChannels < 3 )
      throw new Error( "AstroTemps Redux v1 requires an RGB color image." );

   if ( typeof executeSetiAstroAutoDBEPass != "function" )
      throw new Error( "Redux preflight: SetiAstro Automatic DBE engine is unavailable." );

   if ( !TAPR_hasNativeProcess( "BlurXTerminator" ) &&
        typeof executeSASproCorrectOnly != "function" )
      throw new Error( "Redux preflight: no Optical Correction engine is available." );

   if ( !TAPR_hasNativeProcess( "BlurXTerminator" ) &&
        typeof executeSASproSharpen != "function" )
      throw new Error( "Redux preflight: no Sharpening engine is available." );

   if ( !TAPR_hasNativeProcess( "NoiseXTerminator" ) &&
        typeof executeSASproDenoise != "function" )
      throw new Error( "Redux preflight: no Noise Reduction engine is available." );

   if ( !TAPR_hasNativeProcess( "StarXTerminator" ) &&
        !TAPR_hasNativeProcess( "StarNet2" ) )
      throw new Error( "Redux preflight: neither StarXTerminator nor StarNet2 is installed." );

   if ( !TAPR_hasNativeProcess( "ColorSaturation" ) ||
        !TAPR_hasNativeProcess( "PixelMath" ) )
      throw new Error( "Redux preflight: required native PixInsight processes are unavailable." );

   console.noteln( "Redux preflight completed." );
}

function TAPR_main()
{
   console.show();
   console.writeln( "<end><cbr><br>============================================================" );
   console.noteln( "AstroTemps Redux v" + REDUX_VERSION );
   console.writeln( "============================================================" );

   try
   {
      var sourceView = TAPR_getTargetView();
      TAPR_preflight( sourceView );
      var workView = TAPR_createReduxWorkingCopy( sourceView );
      console.noteln( "Original preserved: " + sourceView.id );
      console.noteln( "Redux working copy: " + workView.id );
   }
   catch ( e )
   {
      console.criticalln( "AstroTemps Redux stopped: " + TAP_errorText( e ) );
      ( new MessageBox(
         "<p><b>AstroTemps Redux stopped.</b></p><p>" + TAP_errorText( e ) + "</p>",
         TAPR_TITLE,
         StdIcon_Error,
         StdButton_Ok
      ) ).execute();
   }
}

TAPR_main();
