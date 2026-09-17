#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "AstroTemps_Redux.js"
text = SOURCE.read_text(encoding="utf-8")

old_primary = '''   try
   {
      primaryFn();
      TAPR_closeStageCheckpoint( checkpoint );
      console.noteln( "Primary completed successfully: " + primaryName );
      return;
   }
'''
new_primary = '''   try
   {
      var primaryResult = primaryFn();
      TAPR_closeStageCheckpoint( checkpoint );
      console.noteln( "Primary completed successfully: " + primaryName );
      return primaryResult;
   }
'''
if old_primary not in text:
    raise SystemExit("Primary fallback-result anchor not found")
text = text.replace(old_primary, new_primary, 1)

old_fallback = '''   try
   {
      fallbackFn();
      TAPR_closeStageCheckpoint( checkpoint );
      console.noteln( "Fallback completed successfully: " + fallbackName );
      return;
   }
'''
new_fallback = '''   try
   {
      var fallbackResult = fallbackFn();
      TAPR_closeStageCheckpoint( checkpoint );
      console.noteln( "Fallback completed successfully: " + fallbackName );
      return fallbackResult;
   }
'''
if old_fallback not in text:
    raise SystemExit("Fallback-result anchor not found")
text = text.replace(old_fallback, new_fallback, 1)

anchor = "\nfunction TAPR_main()\n{\n"
if anchor not in text:
    raise SystemExit("TAPR_main anchor not found")

block = r'''
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
'''

text = text.replace(anchor, "\n" + block + anchor, 1)
SOURCE.write_text(text, encoding="utf-8", newline="\n")
print("Applied Redux Task 5 star-removal implementation.")
