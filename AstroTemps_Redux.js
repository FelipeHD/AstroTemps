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

function TAPR_filterPresetBaseName( name, channel )
{
   name = String( name );
   channel = String( channel ).toUpperCase();

   var uvir = new RegExp( "\\s+" + channel + "-UVIRcut$", "i" );
   if ( uvir.test( name ) )
      return name.replace( uvir, " UVIRcut" ).replace( /\s+/g, " " ).replace( /^\s+|\s+$/g, "" );

   var suffix = new RegExp( "(?:\\s+|[-_])" + channel + "$", "i" );
   if ( suffix.test( name ) )
      return name.replace( suffix, "" ).replace( /^\s+|\s+$/g, "" );

   var token = new RegExp( "(^|[\\s_-])" + channel + "(?=$|[\\s_-])", "i" );
   if ( token.test( name ) )
   {
      var b = name.replace( token, "$1" );
      b = b.replace( /\s+/g, " " ).replace( /--+/g, "-" ).replace( /^[-_\s]+|[-_\s]+$/g, "" );
      return b.length > 0 ? b : null;
   }

   return null;
}

function TAPR_buildSPCCPresets( filterNames )
{
   var groups = {};
   for ( var i = 0; i < filterNames.length; ++i )
   {
      var name = String( filterNames[i] );
      var channel = TAP_spccFilterChannel( name );
      if ( channel != "R" && channel != "G" && channel != "B" )
         continue;

      var base = TAPR_filterPresetBaseName( name, channel );
      if ( base == null || base.length == 0 )
         continue;

      var key = base.toLowerCase();
      if ( groups[key] == null )
         groups[key] = { label: base, R: [], G: [], B: [] };
      groups[key][channel].push( name );
   }

   var presets = [];
   for ( var key in groups )
   {
      var g = groups[key];
      if ( g.R.length == 1 && g.G.length == 1 && g.B.length == 1 &&
           g.R[0] != g.G[0] && g.R[0] != g.B[0] && g.G[0] != g.B[0] )
      {
         presets.push( {
            label: g.label,
            red: g.R[0],
            green: g.G[0],
            blue: g.B[0]
         } );
      }
   }

   presets.sort( function( a, b )
   {
      var aa = a.label.toLowerCase();
      var bb = b.label.toLowerCase();
      return aa < bb ? -1 : aa > bb ? 1 : 0;
   } );

   return presets;
}

function TAPR_SPCCDialog( presets )
{
   this.__base__ = Dialog;
   this.__base__();

   var self = this;
   this.windowTitle = "AstroTemps Redux - SPCC";
   this.choice = null;

   this.info_Label = new Label( this );
   this.info_Label.useRichText = true;
   this.info_Label.wordWrapping = true;
   this.info_Label.text =
      "<p>Select the capture filter used for this image. Redux maps the preset " +
      "to the SPCC R/G/B transmission curves automatically.</p>";

   this.filter_Label = new Label( this );
   this.filter_Label.text = "Capture Filter:";
   this.filter_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;

   this.filter_Combo = new ComboBox( this );
   for ( var i = 0; i < presets.length; ++i )
      this.filter_Combo.addItem( presets[i].label );
   this.filter_Combo.currentItem = presets.length > 0 ? 0 : -1;

   this.newInstance_Button = new ToolButton( this );
   try { this.newInstance_Button.icon = this.scaledResource( ":/process-interface/new-instance.png" ); } catch ( eIcon ) {}
   this.newInstance_Button.toolTip = "Create a reusable AstroTemps Redux Process Icon. The capture filter is not stored in the icon.";
   this.newInstance_Button.onMousePress = function()
   {
      Parameters.clear();
      Parameters.set( "reduxInstance", true );
      self.newInstance();
   };

   this.skip_Button = new PushButton( this );
   this.skip_Button.text = "Skip SPCC";
   this.skip_Button.onClick = function()
   {
      self.choice = { skip: true, preset: null };
      self.ok();
   };

   this.continue_Button = new PushButton( this );
   this.continue_Button.text = "Continue";
   this.continue_Button.defaultButton = true;
   this.continue_Button.enabled = presets.length > 0;
   this.continue_Button.onClick = function()
   {
      if ( self.filter_Combo.currentItem < 0 || self.filter_Combo.currentItem >= presets.length )
         return;
      self.choice = { skip: false, preset: presets[self.filter_Combo.currentItem] };
      self.ok();
   };

   var filterRow = new HorizontalSizer;
   filterRow.spacing = 8;
   filterRow.add( this.filter_Label );
   filterRow.add( this.filter_Combo, 100 );

   var buttonRow = new HorizontalSizer;
   buttonRow.spacing = 8;
   buttonRow.add( this.newInstance_Button );
   buttonRow.addStretch();
   buttonRow.add( this.skip_Button );
   buttonRow.add( this.continue_Button );

   this.sizer = new VerticalSizer;
   this.sizer.margin = 10;
   this.sizer.spacing = 10;
   this.sizer.add( this.info_Label );
   this.sizer.add( filterRow );
   this.sizer.add( buttonRow );

   this.adjustToContents();
   this.setFixedWidth( Math.max( this.width, 520 ) );
}
TAPR_SPCCDialog.prototype = new Dialog;

function TAPR_showSPCCDialog( presets )
{
   var dialog = new TAPR_SPCCDialog( presets );
   if ( !dialog.execute() )
      return null;
   return dialog.choice;
}

function TAPR_runSolverAndSPCC( workView, choice )
{
   if ( choice == null )
      throw new Error( "Redux SPCC selection is unavailable." );

   if ( choice.skip )
   {
      console.warningln( "SPCC skipped by user. ImageSolver is not required for this Redux run." );
      return false;
   }

   if ( choice.preset == null )
      throw new Error( "Redux SPCC requires a valid capture-filter preset." );

   console.noteln( "Redux SPCC preset: " + choice.preset.label );
   var s = defaultSettings();
   s.spcc = true;
   s.spccRedFilter = choice.preset.red;
   s.spccGreenFilter = choice.preset.green;
   s.spccBlueFilter = choice.preset.blue;

   var completed = executeSPCC( workView, s );
   return completed === true;
}

function TAPR_createStageCheckpoint( view, stageName )
{
   if ( view == null || view.isNull )
      throw new Error( "Redux cannot checkpoint an invalid view for " + stageName + "." );

   var src = view.image;
   var id = uniqueImageId( "AstroTemps_Redux_checkpoint" );
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
      TAPR_copyKeywords( view.window, w );
      try { copyViewProperties( view, w.mainView ); } catch ( eProps ) {}
      ok = true;
      return w.mainView;
   }
   finally
   {
      if ( !ok )
         try { w.forceClose(); } catch ( eClose ) {}
   }
}

function TAPR_restoreStageCheckpoint( view, checkpointView )
{
   if ( view == null || view.isNull || checkpointView == null || checkpointView.isNull )
      throw new Error( "Redux checkpoint restore received an invalid view." );

   if ( view.image.width != checkpointView.image.width ||
        view.image.height != checkpointView.image.height ||
        view.image.numberOfChannels != checkpointView.image.numberOfChannels )
      throw new Error( "Redux checkpoint geometry does not match the working image." );

   view.beginProcess( UndoFlag_NoSwapFile );
   try
   {
      view.image.assign( checkpointView.image );
   }
   finally
   {
      view.endProcess();
   }

   try { view.window.keywords = checkpointView.window.keywords; } catch ( eKeywords ) {}
   try { copyViewProperties( checkpointView, view ); } catch ( eProps ) {}
   view.window.bringToFront();
   CoreApplication.processEvents();
}

function TAPR_closeStageCheckpoint( checkpointView )
{
   if ( checkpointView == null || checkpointView.isNull )
      return;
   try
   {
      if ( checkpointView.window != null && !checkpointView.window.isNull )
         checkpointView.window.forceClose();
   }
   catch ( e ) {}
}

function TAPR_runWithFallback( stageName, view, primaryName, primaryFn, fallbackName, fallbackFn )
{
   console.writeln( "<end><cbr><br>------------------------------------------------------------" );
   console.noteln( stageName );
   console.writeln( "Primary engine : " + primaryName );
   console.writeln( "Fallback engine: " + fallbackName );

   var checkpoint = TAPR_createStageCheckpoint( view, stageName );
   var primaryError = "";
   try
   {
      primaryFn();
      TAPR_closeStageCheckpoint( checkpoint );
      console.noteln( "Primary completed successfully: " + primaryName );
      return;
   }
   catch ( ePrimary )
   {
      primaryError = TAP_errorText( ePrimary );
      console.warningln( "Primary failed: " + primaryError );
   }

   TAPR_restoreStageCheckpoint( view, checkpoint );
   console.warningln( "Clean pre-stage state restored. Trying fallback: " + fallbackName );

   try
   {
      fallbackFn();
      TAPR_closeStageCheckpoint( checkpoint );
      console.noteln( "Fallback completed successfully: " + fallbackName );
      return;
   }
   catch ( eFallback )
   {
      var fallbackError = TAP_errorText( eFallback );
      console.criticalln( "Fallback failed: " + fallbackError );
      try { TAPR_restoreStageCheckpoint( view, checkpoint ); } catch ( eRestore ) {}
      TAPR_closeStageCheckpoint( checkpoint );
      throw new Error(
         stageName + " failed with both processing engines.\n\n" +
         "Primary (" + primaryName + "): " + primaryError + "\n\n" +
         "Fallback (" + fallbackName + "): " + fallbackError
      );
   }
}

function TAPR_runOpticalCorrection( view )
{
   var s = defaultSettings();
   s.blurCorrectOverlap = 0.20;
   s.ccOptUseGPU = true;
   s.ccOptTempStretch = false;
   s.ccOptTargetMedian = 0.25;
   s.ccOptChunkSize = 256;
   s.ccOptOverlap = 64;

   TAPR_runWithFallback(
      "[1] Optical Correction",
      view,
      "BlurXTerminator - Correct Only",
      function() { executeBlurXCorrectOnly( view, s ); },
      "Cosmic Clarity SASpro - Correct Only",
      function() { executeSASproCorrectOnly( view, s ); }
   );
}

function TAPR_runGradientRemoval( view )
{
   var s = defaultSettings();
   s.adbeDivideFirst = false;
   s.graxpertSmoothing = 0.000;

   TAPR_runWithFallback(
      "[2] Gradient Removal",
      view,
      "SetiAstro Automatic DBE - Subtract Only",
      function() { executeSetiAstroAutoDBE( view, false ); },
      "GraXpert - Subtract Only",
      function() { executeGraXpertAutoDBE( view, false, s.graxpertSmoothing ); }
   );
}

function TAPR_runSharpening( view )
{
   var s = defaultSettings();
   s.sharpenStars = 0.40;
   s.sharpenAdjustStarHalos = 0.00;
   s.sharpenNonstellarDiameter = 0.0;
   s.sharpenAutoNonstellarPSF = true;
   s.sharpenNonstellar = 0.60;
   s.sharpenLunarPlanetary = false;
   s.sharpenOverlap = 0.20;

   s.ccSharpMode = "Both";
   s.ccSharpStellarAmount = 0.90;
   s.ccSharpNonStellarStrength = 3.00;
   s.ccSharpNonStellarAmount = 0.50;
   s.ccSharpSeparateChannels = false;
   s.ccSharpAutoPSF = false;
   s.ccSharpUseGPU = true;
   s.ccSharpTempStretch = false;
   s.ccSharpTargetMedian = 0.25;
   s.ccSharpChunkSize = 256;
   s.ccSharpOverlap = 64;

   TAPR_runWithFallback(
      "[4] Sharpening",
      view,
      "BlurXTerminator - Sharpening",
      function() { executeBlurXSharpen( view, s ); },
      "Cosmic Clarity SASpro - Sharpening",
      function() { executeSASproSharpen( view, s ); }
   );
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

      var presets = TAPR_buildSPCCPresets( TAP_loadSPCCFilterNames() );
      var choice = TAPR_showSPCCDialog( presets );
      if ( choice == null )
      {
         console.warningln( "AstroTemps Redux cancelled by user before processing." );
         return;
      }

      var workView = TAPR_createReduxWorkingCopy( sourceView );
      console.noteln( "Original preserved: " + sourceView.id );
      console.noteln( "Redux working copy: " + workView.id );
      console.noteln( choice.skip ? "SPCC choice: Skip" : "SPCC choice: " + choice.preset.label );

      // Processing stages are wired into the final orchestration after all
      // stage helpers have been implemented and regression-tested.
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
