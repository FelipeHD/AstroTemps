/*
 * =====================================================================
 * AstroTemps Redux
 * Version 1.3.2 - Windows
 * PixInsight / PJSR
 *
 * One-click opinionated workflow distributed alongside the full
 * AstroTemps AutoProcessing Tool. The full script is included in library
 * mode so Redux can reuse its proven processing engines without opening
 * the configurable AstroTemps interface.
 * =====================================================================
 */

#engine v8

#define ASTROTEMPS_LIBRARY_MODE
#include "AstroTemps_AutoProcessing_Tool.js"

#feature-id Utilities > AstroTemps Redux
#feature-info AstroTemps Redux v1.3.2.<br/>One-click opinionated processing workflow for PixInsight 1.9.4+.

var REDUX_VERSION = "1.3.2";
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

var TAPR_SPCCDialog = class extends Dialog
{
   constructor( presets )
   {
      super();

   var self = this;
   this.windowTitle = TAP_TR_UI( "AstroTemps Redux - SPCC" );
   this.choice = null;
   this.languageChanged = false; // TAPR language selector - development

   
   this.language_Label = new Label( this );
   this.language_Label.text = TAP_TR_UI( "Language:" );
   this.language_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;

   this.language_Combo = new ComboBox( this );
   this.language_Combo.addItem( "English (EN-US)" );
   this.language_Combo.addItem( "Português (PT-BR)" );
   this.language_Combo.currentItem =
      TAP_CURRENT_LANGUAGE == TAP_LANGUAGE_PT_BR ? 1 : 0;
   this.language_Combo.toolTip = TAP_TR_UI(
      "Changes the AstroTemps interface language. Process Console output remains in English."
   );
   this.language_Combo.onItemSelected = function( index )
   {
      var nextLanguage = index == 1 ? TAP_LANGUAGE_PT_BR : TAP_LANGUAGE_EN_US;
      if ( nextLanguage == TAP_CURRENT_LANGUAGE )
         return;

      TAP_setLanguage( nextLanguage );
      self.languageChanged = true;
      self.cancel();
   };

   var languageRow = new HorizontalSizer;
   languageRow.spacing = 6;
   languageRow.addStretch();
   languageRow.add( this.language_Label );
   languageRow.add( this.language_Combo );

this.info_Label = new Label( this );
   this.info_Label.useRichText = true;
   this.info_Label.wordWrapping = true;
   this.info_Label.text =
      TAP_TR_UI( "<p>Select the capture filter used for this image. Redux maps the preset " +
      "to the SPCC R/G/B transmission curves automatically.</p>" );

   // Support the Project -------------------------------------------------
   this.support_Group = new GroupBox( this );
   this.support_Group.title = TAP_TR_UI( "Support the Project" );
   this.support_Group.setScaledMinHeight( 170 );

   this.support_Text = new Label( this.support_Group );
   this.support_Text.useRichText = true;
   this.support_Text.wordWrapping = true;
   this.support_Text.text =
      TAP_TR_UI( "If you find AstroTemps Redux useful and would like to support its development, " +
      "consider buying me a coffee." );

   this.coffee_Link = new Label( this.support_Group );
   this.coffee_Link.useRichText = true;
   this.coffee_Link.wordWrapping = false;
   this.coffee_Link.frameStyle = FrameStyle_Sunken;
   this.coffee_Link.textAlignment = TextAlign_Left | TextAlign_VertCenter;
   this.coffee_Link.setScaledMinHeight( 36 );
   this.coffee_Link.text =
      TAP_TR_UI( "<span style=\"color:#67a9ff\"><b>&nbsp;&nbsp;buymeacoffee.com/temponi</b></span>" );
   this.coffee_Link.toolTip =
      TAP_TR_UI( "<p>Open https://www.buymeacoffee.com/temponi in your default browser.</p>" );
   try
   {
      this.coffee_Link.cursor = new Cursor( StdCursor_PointingHand );
   }
   catch ( eCoffeeCursor ) {}
   this.coffee_Link.onMousePress = function( x, y, button, buttonState, modifiers )
   {
      if ( button == MouseButton_Left )
         lighthouseOpenUrl( "https://www.buymeacoffee.com/temponi" );
   };

   var supportLeftSizer = new VerticalSizer;
   supportLeftSizer.margin = 10;
   supportLeftSizer.spacing = 8;
   supportLeftSizer.add( this.support_Text );
   supportLeftSizer.addStretch();
   supportLeftSizer.add( this.coffee_Link );
   this.support_Group.sizer = supportLeftSizer;

   // PIX — Brazil --------------------------------------------------------
   this.pix_Group = new GroupBox( this );
   this.pix_Group.title = TAP_TR_UI( "PIX — Brazil" );
   this.pix_Group.setScaledMinHeight( 170 );

   this.pix_Text = new Label( this.pix_Group );
   this.pix_Text.useRichText = true;
   this.pix_Text.wordWrapping = true;
   this.pix_Text.text =
      TAP_TR_UI( "Brazilian users who would like to support AstroTemps Redux via PIX can use " +
      "the QR Code shown here." );

   this.pix_QR = new TAPInfo_PIXQRControl( this.pix_Group );

   var pixTextColumn = new VerticalSizer;
   pixTextColumn.spacing = 0;
   pixTextColumn.add( this.pix_Text );
   pixTextColumn.addStretch();

   var pixQRColumn = new VerticalSizer;
   pixQRColumn.spacing = 0;
   pixQRColumn.addStretch();
   pixQRColumn.add( this.pix_QR );

   this.pix_Group.sizer = new HorizontalSizer;
   this.pix_Group.sizer.margin = 10;
   this.pix_Group.sizer.spacing = 10;
   this.pix_Group.sizer.add( pixTextColumn, 100 );
   this.pix_Group.sizer.add( pixQRColumn );

   var supportRow = new HorizontalSizer;
   supportRow.spacing = 10;
   supportRow.add( this.support_Group, 100 );
   supportRow.add( this.pix_Group, 100 );

   this.filter_Label = new Label( this );
   this.filter_Label.text = TAP_TR_UI( "Capture Filter:" );
   this.filter_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;

   this.filter_Combo = new ComboBox( this );
   for ( var i = 0; i < presets.length; ++i )
      this.filter_Combo.addItem( presets[i].label );
   this.filter_Combo.currentItem = presets.length > 0 ? 0 : -1;

   this.newInstance_Button = new ToolButton( this );
   try { this.newInstance_Button.icon = this.scaledResource( ":/process-interface/new-instance.png" ); } catch ( eIcon ) {}
   this.newInstance_Button.toolTip = TAP_TR_UI( "Create a reusable AstroTemps Redux Process Icon. The capture filter is not stored in the icon." );
   this.newInstance_Button.onMousePress = function()
   {
      Parameters.clear();
      Parameters.set( "reduxInstance", true );
      self.newInstance();
   };

   this.skip_Button = new PushButton( this );
   this.skip_Button.text = TAP_TR_UI( "Skip SPCC" );
   this.skip_Button.onClick = function()
   {
      self.choice = { skip: true, preset: null };
      self.ok();
   };

   this.continue_Button = new PushButton( this );
   this.continue_Button.text = TAP_TR_UI( "Continue" );
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
   this.sizer.add( languageRow );
   this.sizer.add( this.info_Label );
   this.sizer.add( filterRow );
   this.sizer.add( supportRow );
   this.sizer.add( buttonRow );

   this.adjustToContents();
   this.setFixedWidth( Math.max( this.width, 700 ) );
   }
};

function TAPR_showSPCCDialog( presets )
{
   for ( ;; )
   {
      var dialog = new TAPR_SPCCDialog( presets );
      var accepted = dialog.execute();

      if ( dialog.languageChanged )
         continue;

      if ( !accepted )
         return null;

      return dialog.choice;
   }
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
      var primaryResult = primaryFn();
      TAPR_closeStageCheckpoint( checkpoint );
      console.noteln( "Primary completed successfully: " + primaryName );
      return primaryResult;
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
      var fallbackResult = fallbackFn();
      TAPR_closeStageCheckpoint( checkpoint );
      console.noteln( "Fallback completed successfully: " + fallbackName );
      return fallbackResult;
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


function TAPR_imageWindowIds()
{
   var ids = [];
   var windows = ImageWindow.windows;
   for ( var i = 0; i < windows.length; ++i )
      if ( windows[i] != null && !windows[i].isNull && windows[i].mainView != null && !windows[i].mainView.isNull )
         ids.push( windows[i].mainView.id );
   return ids;
}

function TAPR_findNewStarsView( beforeIds, workView )
{
   var candidates = [];
   var windows = ImageWindow.windows;
   for ( var i = 0; i < windows.length; ++i )
   {
      var w = windows[i];
      if ( w == null || w.isNull || w.mainView == null || w.mainView.isNull )
         continue;
      var id = w.mainView.id;
      if ( id == workView.id || beforeIds.indexOf( id ) >= 0 || id.indexOf( "AstroTemps_Redux_checkpoint" ) == 0 )
         continue;
      if ( w.mainView.image.width == workView.image.width &&
           w.mainView.image.height == workView.image.height &&
           w.mainView.image.numberOfChannels == workView.image.numberOfChannels )
         candidates.push( w.mainView );
   }

   if ( candidates.length == 0 )
      throw new Error( "Star Removal did not create a stars-only image." );

   for ( var j = 0; j < candidates.length; ++j )
      if ( candidates[j].id.toLowerCase().indexOf( "star" ) >= 0 )
         return candidates[j];

   if ( candidates.length == 1 )
      return candidates[0];

   throw new Error( "Star Removal created multiple new compatible images and Redux could not identify the stars-only output safely." );
}

function TAPR_cleanupNewWindows( beforeIds, preserveIds )
{
   preserveIds = preserveIds || [];
   var windows = ImageWindow.windows.slice( 0 );
   for ( var i = 0; i < windows.length; ++i )
   {
      var w = windows[i];
      if ( w == null || w.isNull || w.mainView == null || w.mainView.isNull )
         continue;
      var id = w.mainView.id;
      if ( beforeIds.indexOf( id ) < 0 && preserveIds.indexOf( id ) < 0 )
      {
         try { w.forceClose(); } catch ( eClose ) {}
      }
   }
}

function TAPR_normalizeStarsView( starsView, workView )
{
   if ( starsView == null || starsView.isNull )
      throw new Error( "Redux received an invalid stars-only image." );

   var desired = uniqueImageId( workView.id + "_stars" );
   starsView.id = desired;
   starsView.window.show();
   starsView.window.bringToFront();
   CoreApplication.processEvents();
   console.noteln( "Stars-only image retained: " + starsView.id + " (expected Redux naming: *_Redux_stars)" );
   return starsView;
}

function TAPR_runStarRemoval( view )
{
   var s = defaultSettings();
   s.starOutputStars = true;
   s.starUnscreen = false;
   s.starOverlap = 0.20;

   s.starnetMask = true;
   s.starnetUnscreen = true;
   s.starnetLinear = true;
   s.starnetUpsample = false;
   s.starnetHighlightProtection = true;

   return TAPR_runWithFallback(
      "[5] Star Removal",
      view,
      "StarXTerminator - Star Removal",
      function()
      {
         var beforeIds = TAPR_imageWindowIds();
         try
         {
            executeStarX( view, s );
            var starsView = TAPR_findNewStarsView( beforeIds, view );
            return TAPR_normalizeStarsView( starsView, view );
         }
         catch ( eStarX )
         {
            TAPR_cleanupNewWindows( beforeIds, [ view.id ] );
            throw eStarX;
         }
      },
      "StarNet2 - Star Removal",
      function()
      {
         var beforeIds = TAPR_imageWindowIds();
         try
         {
            var starsView = executeStarNet2( view, s );
            if ( starsView == null || starsView.isNull )
               starsView = TAPR_findNewStarsView( beforeIds, view );
            return TAPR_normalizeStarsView( starsView, view );
         }
         catch ( eStarNet )
         {
            TAPR_cleanupNewWindows( beforeIds, [ view.id ] );
            throw eStarNet;
         }
      }
   );
}


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

      var result = TAPR_runWorkflow( workView, choice );
      result.workView.window.bringToFront();
   }
   catch ( e )
   {
      console.criticalln( "AstroTemps Redux stopped: " + TAP_errorText( e ) );
      ( TAP_UIMessageBox(
         "<p><b>AstroTemps Redux stopped.</b></p><p>" + TAP_errorText( e ) + "</p>",
         TAPR_TITLE,
         StdIcon_Error,
         StdButton_Ok
      ) ).execute();
   }
}

TAPR_main();