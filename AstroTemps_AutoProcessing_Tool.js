/*
 * =====================================================================
 * AstroTemps AutoProcessing Tool 
 * Version 1.3.1 - macOS
 * PixInsight / PJSR
 *
 * Workflow:
 *   0. Settings / optional Working Copy / snapshots / Auto STF / custom order
 *   1. Optical Correction
 *      -> BlurXTerminator Correct Only OR Cosmic Clarity SASpro Correct Only
 *   2. Automatic DBE
 *   3. SPCC
 *      -> checks for an astrometric solution; ImageSolver runs automatically if needed
 *      -> independent Red / Green / Blue filter selection from the installed SPCC database
 *   4. Sharpening
 *      -> BlurXTerminator OR Cosmic Clarity SASpro
 *   5. Noise Reduction
 *      -> NoiseXTerminator OR Cosmic Clarity SASpro
 *   6. Star Removal
 *      -> StarXTerminator OR StarNet2
 *   7. Find and Neutralize Background
 *   8. Image Stretch
 *   9. Narrowband Normalization (optional interactive preview, post-stretch)
 *   10. Range Selection and HDR
 *      -> native RangeSelection luminosity mask + interactive HDRMultiscaleTransform
 *   11. Masks and Curves
 *      -> six color masks, 3x MaskBlur, sequential masked CurvesTransformation
 *   12. Lighthouse
 *      -> opens the original interactive Lighthouse editing dialog on *_work
 *   13. Dark Structure Enhance
 *   14. Star Stretch
 *   15. Blend Image + Stars
 *
 *
 * Project notice:
 * AstroTemps AutoProcessing Tool was created by Felipe Temponi to concentrate
 * astrophotography processing processes and scripts in a single workflow
 * and make astrophotography post-processing easier to manage.
 * This project may be modified for personal/non-commercial use, but it
 * must not be sold or commercialized. Third-party components and adapted
 * code remain subject to their respective original licenses and notices.
 *
 * Portability note:
 * The workflow avoids user-specific filesystem paths. PixInsight standard
 * For release stability, ImageSolver support files are loaded from the
 * standard PixInsight installation tree on macOS.
 * Third-party engines must be installed by each user. BlurXTerminator,
 * NoiseXTerminator, StarXTerminator, StarNet2 and SPCC are instantiated directly
 * from their installed PixInsight processes; Workspace Process Icons are not
 * required by these stages. Cosmic Clarity SASpro is invoked
 * through its CLI auto-detection logic. Lighthouse is embedded from the source
 * files supplied with this project.
 *
 * PixInsight 1.9.4 note:
 * RC-Astro parameter schemas in this version use ml_version, output_stars,
 * adjust_star_halos and the AI4 NoiseX separation parameters. Older deprecated
 * parameter names are intentionally not used by this version.
 *
 * RC-Astro notice:
 * This script does not include or redistribute BlurXTerminator,
 * NoiseXTerminator, StarXTerminator, their source code, or AI models.
 * It only configures and executes process instances already installed
 * and licensed in the user's PixInsight environment.
 *
 * The Automatic DBE engine is integrated below.
 * See the integrated engine header for SetiAstro attribution and CC BY-NC 4.0 notice.
 * =====================================================================
 */
#ifndef ASTROTEMPS_LIBRARY_MODE
#engine v8
#endif

#ifndef ASTROTEMPS_LIBRARY_MODE
#feature-id Utilities > AstroTemps AutoProcessing Tool
#feature-info AstroTemps AutoProcessing Tool v1.3.1.<br/>macOS build for PixInsight 1.9.4 with embedded ImageSolver V8, native SPCC, RC-Astro/SASpro engines, GraXpert integration, StarNet2, interactive NBN, Lighthouse, and interactive Star Stretch.
#endif
CoreApplication.ensureMinimumVersion( 1, 9, 4 );

/* V8 note: class/helper <pjsr/...> headers such as Sizer.jsh and
 * NumericControl.jsh must not be included. Their objects are provided
 * directly by the PixInsight 1.9.4 V8 runtime. Constant-only headers
 * are retained temporarily for compatibility with legacy code below.
 */
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/ImageOp.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/StdCursor.jsh>
#include <pjsr/ColorSpace.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/BitmapInterpolation.jsh>
#include <pjsr/ButtonCodes.jsh>
#include <pjsr/FrameStyle.jsh>

/*
 * PixInsight 1.9.4 V8 ImageSolver library integration.
 *
 * The TAP ImageSolver V8 adaptation is embedded directly in this file.
 * The solving engine is retained; only the unused legacy ImageSolverDialog
 * remains excluded while USE_SOLVER_LIBRARY is defined, and V8 compatibility
 * points are adapted.
 */
#define TITLE "Image Solver"
#define SETTINGS_MODULE "SOLVER"
#define STAR_CSV_FILE (File.systemTempDirectory + format( "/stars-%03d.csv", CoreApplication.instance ))

#include "../AdP/WCSmetadata.jsh"
#include "../AdP/AstronomicalCatalogs.jsh"

#define USE_SOLVER_LIBRARY
/* ---- Embedded TAP_ImageSolverV8_Fix5.js ---- */
/*
 * Image Plate Solver
 *
 * Plate solving of astronomical images.
 *
 * Copyright (C) 2012-2024, Andres del Pozo
 * Copyright (C) 2019-2024, Juan Conejero (PTeam)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * Temponi AutoProcessing V8 library adaptation Fix 4 (2026)
 * ----------------------------------------------------
 * Derived from the PixInsight ImageSolver 6.3.1 source supplied with the
 * user's PixInsight installation. The original copyright and BSD-style
 * redistribution terms above are retained.
 *
 * Library-mode adaptations only:
 * - excludes ImageSolverDialog when USE_SOLVER_LIBRARY is defined;
 * - updates native process enum access for PJSR/V8;
 * - uses CoreApplication.processEvents();
 * - removes explicit legacy gc() calls;
 * - removes deprecated PJSR class/helper includes already built into V8
 *   (BRQuadTree, LinearTransformation, NumericControl, SectionBar, Sizer, StarDetector).
 *
 * The ImageSolver engine itself (ImageSolver, SolverConfiguration and solving
 * algorithms) is retained. Standalone ImageSolver behavior remains available
 * when USE_SOLVER_LIBRARY is not defined.
 */

/*
 * Coordinate Systems
 *
 * (I) Image Coordinates
 *    Image pixel coordinates on the PixInsight platform.
 *    - Grows from left to right and from top to bottom.
 *    - The origin is at the top left corner of the image. The center of the
 *      top left pixel has image coordinates (0.5,0.5).
 *
 * (G) Gnomonic Projected Space
 *    Projected space resulting of projecting celestial coordinates using a
 *    Gnomonic projection.
 *    - Coincides with the World Intermediate Coordinates of WCS.
 *    - Grows from right to left and from bottom to top.
 *    - The center of the image has coordinates (0,0).
 *
 * (F) FITS WCS Coordinates
 *    Pixels of the image using WCS conventions.
 *    - http://fits.gsfc.nasa.gov/fits_wcs.html
 *      "Representations of World Coordinates in FITS" (Sections 2.1.4 and 5.1)
 *      "Representations of celestial coordinates in FITS" (Section 5, p. 1085)
 *    - Grows from left to right and from bottom to top.
 *    - The center of the bottom left pixel has the coordinates (1,1).
 */

/* beautify ignore:start */

#ifndef USE_SOLVER_LIBRARY
// Global control variable for PCL invocation.
var __PJSR_AdpImageSolver_SuccessCount = 0;
#endif

if ( CoreApplication === undefined ||
     CoreApplication.versionRevision === undefined ||
     CoreApplication.versionMajor*1e11
   + CoreApplication.versionMinor*1e8
   + CoreApplication.versionRelease*1e5
   + CoreApplication.versionRevision*1e2 < 100900000000 )
{
   throw new Error( "This script requires PixInsight core version 1.9.0 or higher." );
}

#define __PJSR_USE_STAR_DETECTOR_V2

/*
 * V8 runtime provides BRQuadTree, LinearTransformation, NumericControl,
 * SectionBar, HorizontalSizer/VerticalSizer and StarDetector directly.
 * Do not include their legacy <pjsr/...> headers here.
 */
#include <pjsr/ColorSpace.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/RBFType.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdCursor.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/UndoFlag.jsh>

#define SOLVERVERSION "6.3.1"

#ifndef USE_SOLVER_LIBRARY

#define TITLE           "Image Solver"
#define SETTINGS_MODULE "SOLVER"
#define STAR_CSV_FILE   (File.systemTempDirectory + format( "/stars-%03d.csv", CoreApplication.instance ))

#include "WCSmetadata.jsh"
#include "AstronomicalCatalogs.jsh"
#include "SearchCoordinatesDialog.js"
#include "CatalogDownloader.js"

#endif // !USE_SOLVER_LIBRARY

#define SETTINGS_MODULE_SCRIPT "SOLVER"

/* beautify ignore:end */

/*
 * Enumerations
 */
function CatalogMode() {}
CatalogMode.prototype.LocalText = 0;
CatalogMode.prototype.Online = 1;
CatalogMode.prototype.Automatic = 2;
CatalogMode.prototype.LocalXPSDServer = 3;

function IntersectionMode() {}
IntersectionMode.prototype.Never = 0;
IntersectionMode.prototype.Automatic = 1;
IntersectionMode.prototype.Always = 2;

/*
 * SolverConfiguration: Configuration information of the ImageSolver engine.
 */
function SolverConfiguration( module )
{
   this.__base__ = ObjectWithSettings;
   this.__base__(
      module,
      "solver",
      new Array(
         [ "version", DataType_UCString ],
         [ "magnitude", DataType_Float ],
         [ "autoMagnitude", DataType_Boolean ],
         [ "databasePath", DataType_UCString ],
         [ "generateErrorImg", DataType_Boolean ],
         [ "structureLayers", DataType_UInt8 ],
         [ "minStructureSize", DataType_UInt8 ],
         [ "hotPixelFilterRadius", DataType_UInt8 ],
         [ "noiseReductionFilterRadius", DataType_UInt8 ],
         [ "sensitivity", DataType_Double ],
         [ "peakResponse", DataType_Double ],
         [ "brightThreshold", DataType_Double ],
         [ "maxStarDistortion", DataType_Double ],
         [ "autoPSF", DataType_Boolean ],
         [ "catalogMode", DataType_UInt8 ],
         [ "vizierServer", DataType_UCString ],
         [ "showStars", DataType_Boolean ],
         [ "showStarMatches", DataType_Boolean ],
         [ "showSimplifiedSurfaces", DataType_Boolean ],
         [ "showDistortion", DataType_Boolean ],
         [ "generateDistortModel", DataType_Boolean ],
         [ "catalog", DataType_UCString ],
         [ "distortionCorrection", DataType_Boolean ],
         [ "rbfType", DataType_Int32 ],
         [ "maxSplinePoints", DataType_Int32 ],
         [ "splineOrder", DataType_UInt8 ],
         [ "splineSmoothing", DataType_Float ],
         [ "enableSimplifier", DataType_Boolean ],
         [ "simplifierRejectFraction", DataType_Float ],
         [ "outlierDetectionRadius", DataType_Int32 ],
         [ "outlierDetectionMinThreshold", DataType_Float ],
         [ "outlierDetectionSigma", DataType_Float ],
         [ "useActive", DataType_Boolean ],
         [ "outSuffix", DataType_UCString ],
         [ "files", Ext_DataType_StringArray ],
         [ "projection", DataType_UInt8 ],
         [ "projectionOriginMode", DataType_UInt8 ],
         [ "restrictToHQStars", DataType_Boolean ],
         [ "intersectionMode", DataType_UInt8 ],
         [ "tryApparentCoordinates", DataType_Boolean ],
         [ "tryExhaustiveInitialAlignment", DataType_Boolean ]
      )
   );

   this.version = SOLVERVERSION;
   this.useActive = true;
   this.files = [];
   this.catalogMode = CatalogMode.prototype.Automatic;
   this.availableCatalogs = [
      new PPMXLCatalog(),
      new TychoCatalog(),
      new HR_Catalog(),
      new GaiaDR2_Catalog()
   ];
   // AstroTemps embedded-V8 policy:
   // local Gaia XPSD catalogs are intentionally not exposed here. The
   // AstronomicalCatalogs.jsh XPSD wrappers depend on Gaia native enum bindings
   // that are not ABI-stable in the embedded V8 context. Online catalogs remain
   // fully available and are used automatically by ImageSolver.
   this.availableXPSDServers = [];
   this.vizierServer = "https://vizier.cds.unistra.fr/";
   this.magnitude = 12;
   this.maxIterations = 100;
   this.structureLayers = 5;
   this.minStructureSize = 0;
   this.hotPixelFilterRadius = 1;
   this.noiseReductionFilterRadius = 0;
   this.sensitivity = 0.5;
   this.peakResponse = 0.5;
   this.brightThreshold = 3.0;
   this.maxStarDistortion = 0.6;
   this.autoPSF = false;
   this.generateErrorImg = false;
   this.showStars = false;
   this.catalog = "PPMXL";
   this.autoMagnitude = true;
   this.showStarMatches = false;
   this.showSimplifiedSurfaces = false;
   this.showDistortion = false;
   this.distortionCorrection = true;
   this.rbfType = WCS_DEFAULT_RBF_TYPE;
   this.maxSplinePoints = WCS_DEFAULT_MAX_SPLINE_POINTS;
   this.splineOrder = 2;
   this.splineSmoothing = 0.005;
   this.enableSimplifier = true;
   this.simplifierRejectFraction = 0.10;
   this.outlierDetectionRadius = 160;
   this.outlierDetectionMinThreshold = 4.0;
   this.outlierDetectionSigma = 5.0;
   this.generateDistortModel = false;
   this.outSuffix = "_ast";
   this.projection = 0;
   this.projectionOriginMode = 0;
   this.restrictToHQStars = false;
   this.intersectionMode = IntersectionMode.prototype.Automatic;
   this.tryApparentCoordinates = true;
   this.tryExhaustiveInitialAlignment = false;

   this.ResetSettings = function()
   {
      Settings.remove( SETTINGS_MODULE );
   };
}

SolverConfiguration.prototype = new ObjectWithSettings;

// ----------------------------------------------------------------------------

#ifndef USE_SOLVER_LIBRARY

/*
 * ImageSolverDialog: Configuration dialog for the plate solver.
 */
function ImageSolverDialog( solverCfg, metadata, showTargetImage )
{
   this.__base__ = Dialog;
   this.__base__();

   let labelWidth1 = this.font.width( "Minimum structure size:" + "M" );
   let radioLabelWidth = this.font.width( "Focal distance:" + "M" );
   let spinBoxWidth = 7 * this.font.width( 'M' );

   this.solverCfg = solverCfg;
   this.metadata = metadata;

   this.helpLabel = new Label( this );
   this.helpLabel.frameStyle = FrameStyle_Box;
   this.helpLabel.minWidth = 45 * this.font.width( 'M' );
   this.helpLabel.margin = 6;
   this.helpLabel.wordWrapping = true;
   this.helpLabel.useRichText = true;
   this.helpLabel.text = "<p><b>ImageSolver v" + SOLVERVERSION + "</b> &mdash; " +
      "A script for the calculation of astrometric solutions.<br/>" +
      "Copyright &copy; 2012-2024 Andr&eacute;s del Pozo | &copy; 2019-2024 Juan Conejero (PTeam)</p>";

   function toggleSectionHandler( section, toggleBegin )
   {
      if ( !toggleBegin )
      {
         section.dialog.setVariableHeight();
         section.dialog.adjustToContents();
         if ( section.dialog.targetImage_Section && section.dialog.targetImage_Section.isCollapsed() ||
            section.dialog.solverCfg.useActive )
            section.dialog.setFixedHeight();
         else
            section.dialog.setMinHeight();
      }
   }

   // -------------------------------------------------------------------------
   // Target Image
   // -------------------------------------------------------------------------

   if ( showTargetImage )
   {
      let hasActiveWindow = ImageWindow.activeWindow && ImageWindow.activeWindow.isWindow;
      if ( !hasActiveWindow )
         this.solverCfg.useActive = false;

      //

      this.activeWindow_RadioButton = new RadioButton( this );
      this.activeWindow_RadioButton.text = "Active window";
      this.activeWindow_RadioButton.checked = this.solverCfg.useActive == true;
      this.activeWindow_RadioButton.minWidth = labelWidth1;
      this.activeWindow_RadioButton.toolTip = "<p>The script will solve the active image window.</p>";
      this.activeWindow_RadioButton.enabled = hasActiveWindow;
      this.activeWindow_RadioButton.onCheck = function( checked )
      {
         this.dialog.solverCfg.useActive = true;
         this.dialog.EnableFileControls();
      };

      this.activeWindow_Sizer = new HorizontalSizer;
      this.activeWindow_Sizer.addUnscaledSpacing( labelWidth1 + this.logicalPixelsToPhysical( 4 ) );
      this.activeWindow_Sizer.add( this.activeWindow_RadioButton );
      this.activeWindow_Sizer.addStretch();

      //

      this.listOfFiles_RadioButton = new RadioButton( this );
      this.listOfFiles_RadioButton.text = "List of files";
      this.listOfFiles_RadioButton.checked = !this.solverCfg.useActive;
      this.listOfFiles_RadioButton.minWidth = labelWidth1;
      this.listOfFiles_RadioButton.toolTip = "<p>The script will solve a list of image files.</p>";
      this.listOfFiles_RadioButton.onCheck = function( checked )
      {
         this.dialog.solverCfg.useActive = false;
         this.dialog.EnableFileControls();
      };

      this.listOfFiles_Sizer = new HorizontalSizer;
      this.listOfFiles_Sizer.addUnscaledSpacing( labelWidth1 + this.logicalPixelsToPhysical( 4 ) );
      this.listOfFiles_Sizer.add( this.listOfFiles_RadioButton );
      this.listOfFiles_Sizer.addStretch();

      //

      this.fileList_TreeBox = new TreeBox( this );
      this.fileList_TreeBox.rootDecoration = false;
      this.fileList_TreeBox.alternateRowColor = true;
      this.fileList_TreeBox.multipleSelection = true;
      this.fileList_TreeBox.headerVisible = false;
      this.fileList_TreeBox.setMinHeight( this.font.pixelSize * 11 );
      this.fileList_TreeBox.numberOfColumns = 2;
      this.fileList_TreeBox.showColumn( 1, false );
      this.fileList_TreeBox.toolTip = "<p>List of files for which astrometric solutions will be computed.</p>";
      if ( this.solverCfg.files )
      {
         for ( let i = 0; i < this.solverCfg.files.length; ++i )
         {
            let node = new TreeBoxNode( this.fileList_TreeBox );
            node.setText( 0, this.solverCfg.files[i] );
         }
      }
      else
         this.solverCfg.files = new Array();

      //

      this.addFiles_Button = new PushButton( this );
      this.addFiles_Button.text = "Add files";
      this.addFiles_Button.toolTip = "Add files to the list";
      this.addFiles_Button.onMousePress = function()
      {
         let ofd = new OpenFileDialog;
         ofd.multipleSelections = true;
         ofd.caption = "Select files";
         //ofd.loadImageFilters();
         ofd.filters = [
            [ "All supported formats", ".xisf", ".fit", ".fits", ".fts" ],
            [ "XISF Files", ".xisf" ],
            [ "FITS Files", ".fit", ".fits", ".fts" ]
         ];
         if ( ofd.execute() )
         {
            for ( let i = 0; i < ofd.fileNames.length; ++i )
            {
               this.dialog.solverCfg.files.push( ofd.fileNames[i] );
               let node = new TreeBoxNode( this.dialog.fileList_TreeBox );
               node.checkable = false;
               node.setText( 0, ofd.fileNames[i] );
            }
            this.dialog.fileList_TreeBox.adjustColumnWidthToContents( 1 );
         }
      };

      //

      this.removeFiles_Button = new PushButton( this );
      this.removeFiles_Button.text = "Remove files";
      this.removeFiles_Button.toolTip = "<p>Removes the selected files from the list.</p>";
      this.removeFiles_Button.onMousePress = function()
      {
         for ( let i = this.dialog.fileList_TreeBox.numberOfChildren - 1; i >= 0; --i )
            if ( this.dialog.fileList_TreeBox.child( i ).selected )
            {
               this.dialog.solverCfg.files.splice( i, 1 );
               this.dialog.fileList_TreeBox.remove( i );
            }
      };

      //

      this.clearFiles_Button = new PushButton( this );
      this.clearFiles_Button.text = "Clear files";
      this.clearFiles_Button.toolTip = "<p>Clears the list of files.</p>";
      this.clearFiles_Button.onMousePress = function()
      {
         this.dialog.fileList_TreeBox.clear();
         this.dialog.solverCfg.files = new Array();
      };

      //

      this.fileButtons_Sizer = new VerticalSizer;
      this.fileButtons_Sizer.spacing = 6;
      this.fileButtons_Sizer.add( this.addFiles_Button );
      this.fileButtons_Sizer.add( this.removeFiles_Button );
      this.fileButtons_Sizer.addSpacing( 8 );
      this.fileButtons_Sizer.add( this.clearFiles_Button );
      this.fileButtons_Sizer.addStretch();

      //

      this.outputFileSuffix_Label = new fieldLabel( this, "Output file suffix:", labelWidth1 - 4 );

      this.outputFileSuffix_Edit = new Edit( this );
      this.outputFileSuffix_Edit.text = this.solverCfg.outSuffix ? this.solverCfg.outSuffix : "";
      this.outputFileSuffix_Edit.toolTip = "<p>This suffix will be appended to each file name " +
         "when saving the astrometric solution to a new XISF file.</p>" +
         "<p>If this suffix is empty, original XISF input files will be overwritten.</p>";
      this.outputFileSuffix_Edit.onTextUpdated = function( value )
      {
         this.dialog.solverCfg.outSuffix = value ? value.trim() : "";
      };

      this.outputFileSuffix_Sizer = new HorizontalSizer;
      this.outputFileSuffix_Sizer.spacing = 6;
      this.outputFileSuffix_Sizer.add( this.outputFileSuffix_Label );
      this.outputFileSuffix_Sizer.add( this.outputFileSuffix_Edit );
      this.outputFileSuffix_Sizer.addStretch();

      //

      this.files_Sizer2 = new HorizontalSizer;
      this.files_Sizer2.spacing = 6;
      this.files_Sizer2.add( this.fileList_TreeBox, 100 );
      this.files_Sizer2.add( this.fileButtons_Sizer );

      this.files_Control = new Control( this );
      this.files_Sizer = new VerticalSizer;
      this.files_Sizer.spacing = 6;
      this.files_Sizer.add( this.files_Sizer2, 100 );
      this.files_Sizer.add( this.outputFileSuffix_Sizer );
      this.files_Control.sizer = this.files_Sizer;

      //

      this.EnableFileControls = function()
      {
         this.fileList_TreeBox.enabled = !this.solverCfg.useActive;
         this.addFiles_Button.enabled = !this.solverCfg.useActive;
         this.removeFiles_Button.enabled = !this.solverCfg.useActive;
         this.clearFiles_Button.enabled = !this.solverCfg.useActive;
         this.files_Control.visible = !this.solverCfg.useActive;
         this.setVariableHeight();
         this.targetImage_Control.setVariableHeight();
         this.targetImage_Control.adjustToContents();
         this.adjustToContents();
         if ( this.solverCfg.useActive )
         {
            this.targetImage_Control.setFixedSize();
            this.setFixedSize();
         }
         else
         {
            this.targetImage_Control.setMinHeight();
            this.setMinHeight();
         }
      };

      //

      this.targetImage_Control = new Control( this )
      this.targetImage_Control.sizer = new VerticalSizer;
      this.targetImage_Control.sizer.margin = 6;
      this.targetImage_Control.sizer.spacing = 4;
      this.targetImage_Control.sizer.add( this.activeWindow_Sizer );
      this.targetImage_Control.sizer.add( this.listOfFiles_Sizer );
      this.targetImage_Control.sizer.add( this.files_Control, 100 );

      this.targetImage_Section = new SectionBar( this, "Target Image" );
      this.targetImage_Section.setSection( this.targetImage_Control );
      this.targetImage_Section.onToggleSection = toggleSectionHandler;
   } // if ( showTargetImage )

   // -------------------------------------------------------------------------
   // Image Parameters
   // -------------------------------------------------------------------------

   let coordinatesTooltip = "<p>Initial equatorial coordinates. Must be inside the image.</p>";

   // CoordsEditor
   this.coords_Editor = new CoordinatesEditor( this,
      new Point( ( this.metadata.ra !== null ) ? this.metadata.ra : 0,
         ( this.metadata.dec !== null ) ? this.metadata.dec : 0 ),
      labelWidth1, spinBoxWidth, coordinatesTooltip );

   this.search_Button = new PushButton( this );
   this.search_Button.text = "Search";
   this.search_Button.icon = this.scaledResource( ":/icons/find.png" );
   this.search_Button.onClick = function()
   {
      let search = new SearchCoordinatesDialog( null, true, false );
      search.windowTitle = "Online Coordinate Search";
      if ( search.execute() )
      {
         let object = search.object;
         if ( !object )
            return;
         this.dialog.coords_Editor.SetCoords( object.posEq );
      }
   };

   this.coords_Sizer = new HorizontalSizer;
   this.coords_Sizer.spacing = 8;
   this.coords_Sizer.add( this.coords_Editor );
   this.coords_Sizer.addStretch();
   this.coords_Sizer.add( this.search_Button );

   //

   this.dateTime_Editor = new DateTimeEditor( this, this.metadata.observationTime,
                                              labelWidth1, spinBoxWidth, true/*withTimeControls*/ );
   //

   this.topocentric_CheckBox = new CheckBox( this );
   this.topocentric_CheckBox.text = "Topocentric";
   this.topocentric_CheckBox.toolTip = "<p>Compute topocentric star places.</p>" +
      "<p>When this option is enabled, astrometric and proper star positions are computed with respect to the observation location " +
      "relative to the Earth's center of mass, as defined by the geodetic coordinates specified below: longitude, latitude, and height. " +
      "When this option is disabled, star positions are computed relative to the geocenter.</p>" +
      "<p>For generation of astrometric solutions in the International Celestial Reference System (ICRS), the observation location " +
      "is only used to compute diurnal parallax corrections, which are very small for distant objects and hence can be neglected in most " +
      "practical applications.</p>" +
      "<p>For astrometric solutions in the Geocentric Celestial Reference System (GCRS), the geodetic coordinates of the observer are " +
      "used to compute diurnal aberration and parallax corrections. Diurnal aberration is caused by the velocity of the observer on or " +
      "near the surface of the rotating Earth. The effect of diurnal aberration is relatively small (a maximum of about 0.32 arcseconds " +
      "for an observer at the Equator), but not negligible for astrometric solutions in the GCRS.</p>" +
      "<p>Besides generation of astrometric solutions in different coordinate reference systems, the position of the observer is necessary " +
      "to find and annotate solar system bodies accurately in astrometrically solved images.</p>" +
      "<p>All of the corrections and procedures described above require accurate geodetic coordinates of the observation location: " +
      "longitude and latitude in degrees and height in meters, as specified in the controls below.</p>";
   this.topocentric_CheckBox.checked = this.metadata.topocentric;
   this.topocentric_CheckBox.onCheck = function( checked )
   {
      this.dialog.metadata.topocentric = checked;
      this.dialog.observerData_Control.enabled = checked;
   };

   this.topocentric_Sizer = new HorizontalSizer;
   this.topocentric_Sizer.addUnscaledSpacing( labelWidth1 + this.logicalPixelsToPhysical( 4 ) );
   this.topocentric_Sizer.add( this.topocentric_CheckBox );
   this.topocentric_Sizer.addStretch();

   this.observerData_Control = new GeodeticCoordinatesEditor( this,
      this.metadata.obsLongitude ? this.metadata.obsLongitude : 0,
      this.metadata.obsLatitude ? this.metadata.obsLatitude : 0,
      this.metadata.obsHeight ? this.metadata.obsHeight : 0,
      labelWidth1, spinBoxWidth );

   this.observerData_Control.enabled = this.metadata.topocentric;

   //

   this.metadata.useFocal = this.metadata.useFocal && this.metadata.xpixsz != null && this.metadata.xpixsz > 0;

   this.focal_RadioButton = new RadioButton( this );
   this.focal_RadioButton.checked = this.metadata.useFocal;
   this.focal_RadioButton.enabled = this.metadata.xpixsz != null && this.metadata.xpixsz > 0;
   this.focal_RadioButton.onCheck = function( value )
   {
      this.dialog.focal_NumericEdit.enabled = value;
      this.dialog.metadata.useFocal = true;
   };

   this.focal_Label = new Label( this );
   this.focal_Label.textAlignment = TextAlign_Left | TextAlign_VertCenter;
   this.focal_Label.text = "Focal distance:";
   this.focal_Label.setFixedWidth( radioLabelWidth );
   this.focal_Label.mouseTracking = true;
   this.focal_Label.onMouseRelease = function()
   {
      if ( this.dialog.focal_RadioButton.enabled )
      {
         this.dialog.focal_RadioButton.checked = true;
         this.dialog.focal_RadioButton.onCheck( true );
      }
   };

   this.focal_NumericEdit = new NumericEdit( this );
   this.focal_NumericEdit.setReal( true );
   this.focal_NumericEdit.setPrecision( 3 );
   this.focal_NumericEdit.setRange( 0.001, 1e6 );
   this.focal_NumericEdit.enableFixedPrecision( true );
   this.focal_NumericEdit.label.visible = false;
   this.focal_NumericEdit.edit.setFixedWidth( this.font.width( "X99999.999X" ) );
   this.focal_NumericEdit.toolTip = "<p>Effective focal length of the optical system in millimeters.</p>";
   this.focal_NumericEdit.setValue( this.metadata.focal ? this.metadata.focal : 0 );
   this.focal_NumericEdit.enabled = this.metadata.useFocal;
   this.focal_NumericEdit.onValueUpdated = function( value )
   {
      this.dialog.metadata.focal = value;
      if ( this.dialog.metadata.xpixsz )
      {
         this.dialog.metadata.resolution = (this.dialog.metadata.focal > 0) ?
               this.dialog.metadata.xpixsz / this.dialog.metadata.focal * 0.18 / Math.PI : 0;
         this.dialog.resolution_NumericEdit.setValue( this.dialog.metadata.resolution * 3600 );
      }
   };

   this.focal_mm_Label = new Label( this );
   this.focal_mm_Label.text = "mm";

   this.resolution_RadioButton = new RadioButton( this );
   this.resolution_RadioButton.checked = !this.metadata.useFocal;
   this.resolution_RadioButton.onCheck = function( value )
   {
      this.dialog.resolution_NumericEdit.enabled = value;
      this.dialog.metadata.useFocal = false;
   };

   this.resolution_Label = new Label( this );
   this.resolution_Label.textAlignment = TextAlign_Left | TextAlign_VertCenter;
   this.resolution_Label.text = "Resolution:";
   this.resolution_Label.setFixedWidth( radioLabelWidth );
   this.resolution_Label.mouseTracking = true;
   this.resolution_Label.onMouseRelease = function()
   {
      this.dialog.resolution_RadioButton.checked = true;
      this.dialog.resolution_RadioButton.onCheck( true );
   };

   this.resolution_NumericEdit = new NumericEdit( this );
   this.resolution_NumericEdit.setReal( true );
   this.resolution_NumericEdit.setPrecision( 3 );
   this.resolution_NumericEdit.setRange( 0.001, 1e6 );
   this.resolution_NumericEdit.enableFixedPrecision( true );
   this.resolution_NumericEdit.label.visible = false;
   this.resolution_NumericEdit.edit.setFixedWidth( this.font.width( "X99999.999X" ) );
   this.resolution_NumericEdit.toolTip = "<p>Resolution of the image in arcseconds per pixel.</p>";
   this.resolution_NumericEdit.setValue( this.metadata.resolution ? this.metadata.resolution * 3600 : 0 );
   this.resolution_NumericEdit.enabled = !this.metadata.useFocal;
   this.resolution_NumericEdit.onValueUpdated = function( value )
   {
      this.dialog.metadata.resolution = value / 3600;
      if ( this.dialog.metadata.xpixsz )
      {
         this.dialog.metadata.focal = (this.dialog.metadata.resolution > 0) ?
               this.dialog.metadata.xpixsz / this.dialog.metadata.resolution * 0.18 / Math.PI : 0;
         this.dialog.focal_NumericEdit.setValue( this.dialog.metadata.focal );
      }
   };

   this.resolution_asp_Label = new Label( this );
   this.resolution_asp_Label.text = "\"/px";

   this.focal_Sizer = new HorizontalSizer;
   this.focal_Sizer.spacing = 4;
   this.focal_Sizer.add( this.focal_RadioButton );
   this.focal_Sizer.add( this.focal_Label );
   this.focal_Sizer.add( this.focal_NumericEdit );
   this.focal_Sizer.add( this.focal_mm_Label );
   this.focal_Sizer.addStretch();

   this.resolution_Sizer = new HorizontalSizer;
   this.resolution_Sizer.spacing = 4;
   this.resolution_Sizer.add( this.resolution_RadioButton );
   this.resolution_Sizer.add( this.resolution_Label );
   this.resolution_Sizer.add( this.resolution_NumericEdit );
   this.resolution_Sizer.add( this.resolution_asp_Label );
   this.resolution_Sizer.addStretch();

   //

   this.scaleStack_Sizer = new VerticalSizer;
   this.scaleStack_Sizer.spacing = 4;
   this.scaleStack_Sizer.add( this.focal_Sizer );
   this.scaleStack_Sizer.add( this.resolution_Sizer );

   //

   this.scale_Label = new fieldLabel( this, "Image scale:", labelWidth1 );
   this.scale_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;

   this.scaleBracket_Label = new Label( this );
   this.scaleBracket_Label.textAlignment = TextAlign_VertCenter;
   this.scaleBracket_Label.text = '[';
   this.scaleBracket_Label.font = new Font( "DejaVu Sans Mono", this.font.pointSize * 2 );

   this.scale_Sizer = new HorizontalSizer;
   this.scale_Sizer.spacing = 4;
   this.scale_Sizer.add( this.scale_Label );
   this.scale_Sizer.add( this.scaleBracket_Label );
   this.scale_Sizer.add( this.scaleStack_Sizer );
   this.scale_Sizer.addStretch();

   //

   this.pixelSize_Label = new fieldLabel( this, "Pixel size:", labelWidth1 );

   this.pixelSize_NumericEdit = new NumericEdit( this );
   this.pixelSize_NumericEdit.setReal( true );
   this.pixelSize_NumericEdit.setPrecision( 2 );
   this.pixelSize_NumericEdit.setRange( 0.1, 3600 );
   this.pixelSize_NumericEdit.enableFixedPrecision( true );
   this.pixelSize_NumericEdit.label.visible = false;
   this.pixelSize_NumericEdit.edit.setFixedWidth( spinBoxWidth );
   this.pixelSize_NumericEdit.toolTip = "<p>Pixel size in micrometers. The image is assumed to have square pixels.</p>";
   this.pixelSize_NumericEdit.setValue( this.metadata.xpixsz ? this.metadata.xpixsz : 7.0 );
   this.pixelSize_NumericEdit.onValueUpdated = function( value )
   {
      this.dialog.metadata.xpixsz = value;
      if ( this.dialog.metadata.xpixsz > 0 && this.dialog.metadata.xpixsz < 3600 )
      {
         this.dialog.focal_RadioButton.enabled = true;
         if ( this.dialog.metadata.useFocal )
         {
            this.dialog.metadata.resolution = (this.dialog.metadata.focal > 0) ?
                  this.dialog.metadata.xpixsz / this.dialog.metadata.focal * 0.18 / Math.PI : 0;
            this.dialog.resolution_NumericEdit.setValue( this.dialog.metadata.resolution * 3600 );
         }
         else
         {
            this.dialog.metadata.focal = (this.dialog.metadata.resolution > 0) ?
                  this.dialog.metadata.xpixsz / this.dialog.metadata.resolution * 0.18 / Math.PI : 0;
            this.dialog.focal_NumericEdit.setValue( this.dialog.metadata.focal );
         }
      }
      else
      {
         this.dialog.focal_RadioButton.enabled = false;
         this.dialog.metadata.useFocal = false;
         this.dialog.resolution_RadioButton.checked = true;
         this.dialog.resolution_NumericEdit.enabled = true;
      }
   };

   this.pixelSize_um_Label = new Label( this );
   this.pixelSize_um_Label.text = "\u03BCm";

   this.pixelSize_Sizer = new HorizontalSizer;
   this.pixelSize_Sizer.spacing = 4;
   this.pixelSize_Sizer.add( this.pixelSize_Label );
   this.pixelSize_Sizer.add( this.pixelSize_NumericEdit );
   this.pixelSize_Sizer.add( this.pixelSize_um_Label );
   this.pixelSize_Sizer.addStretch();

   //

   this.coordinatesEpochAndScale_Control = new Control( this );
   this.coordinatesEpochAndScale_Control.sizer = new VerticalSizer;
   this.coordinatesEpochAndScale_Control.sizer.margin = 0;
   this.coordinatesEpochAndScale_Control.sizer.spacing = 4;
   this.coordinatesEpochAndScale_Control.sizer.add( this.coords_Sizer );
   this.coordinatesEpochAndScale_Control.sizer.add( this.dateTime_Editor );
   this.coordinatesEpochAndScale_Control.sizer.add( this.topocentric_Sizer );
   this.coordinatesEpochAndScale_Control.sizer.add( this.observerData_Control );
   this.coordinatesEpochAndScale_Control.sizer.add( this.scale_Sizer );
   this.coordinatesEpochAndScale_Control.sizer.add( this.pixelSize_Sizer );

   //

   this.imageParameters_Control = new Control( this )

   this.imageParameters_Control.sizer = new VerticalSizer;
   this.imageParameters_Control.sizer.margin = 6;
   this.imageParameters_Control.sizer.add( this.coordinatesEpochAndScale_Control );

   this.imageParameters_Section = new SectionBar( this, "Image Parameters" );
   this.imageParameters_Section.setSection( this.imageParameters_Control );
   this.imageParameters_Section.onToggleSection = toggleSectionHandler;

   // -------------------------------------------------------------------------
   // Model Parameters
   // -------------------------------------------------------------------------

   this.referenceSystem_Label = new fieldLabel( this, "Reference system:", labelWidth1 );

   this.referenceSystem_ComboBox = new ComboBox( this );
   this.referenceSystem_ComboBox.editEnabled = false;
   this.referenceSystem_ComboBox.addItem( "ICRS" );
   this.referenceSystem_ComboBox.addItem( "GCRS" );
   //    this.referenceSystem_ComboBox.addItem( "Geocentric apparent coordinates" );
   switch ( this.dialog.metadata.referenceSystem )
   {
   default:
   case "ICRS":
      this.referenceSystem_ComboBox.currentItem = 0;
      break;
   case "GCRS":
      this.referenceSystem_ComboBox.currentItem = 1;
      break;
   }
   this.referenceSystem_ComboBox.toolTip = "<p>Reference system of celestial coordinates:</p>" +
      "<p><b>ICRS</b> (International Celestial Reference System). The image solver will use astrometric " +
      "positions computed from catalog star coordinates and properties. This includes space motion (proper " +
      "motions, parallax and radial velocity, when available) and gravitational deflection of light.</p>" +
      "<p><b>GCRS</b> (Geocentric Celestial Reference System). The image solver will use proper positions. " +
      "These include the same transformations applied to compute astrometric positions, plus annual and diurnal " +
      "aberration (rigorous relativistic model) to obtain the true direction of each source as seen by the observer.</p>";
   this.referenceSystem_ComboBox.onItemSelected = function()
   {
      switch ( this.dialog.referenceSystem_ComboBox.currentItem )
      {
      default:
      case 0:
         this.dialog.metadata.referenceSystem = "ICRS";
         break;
      case 1:
         this.dialog.metadata.referenceSystem = "GCRS";
         break;
      }
   };

   this.referenceSystem_Sizer = new HorizontalSizer;
   this.referenceSystem_Sizer.spacing = 4;
   this.referenceSystem_Sizer.add( this.referenceSystem_Label );
   this.referenceSystem_Sizer.add( this.referenceSystem_ComboBox );
   this.referenceSystem_Sizer.addStretch();

   //

   this.automaticCatalog_RadioButton = new RadioButton( this );
   this.automaticCatalog_RadioButton.text = "Automatic catalog";
   this.automaticCatalog_RadioButton.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   this.automaticCatalog_RadioButton.setMinWidth( labelWidth1 );
   this.automaticCatalog_RadioButton.checked = this.solverCfg.catalogMode == CatalogMode.prototype.Automatic;
   this.automaticCatalog_RadioButton.toolTip = "<p>The script will select a star catalog automatically " +
      "based on the estimated field of view of the image.</p>";
   this.automaticCatalog_RadioButton.onCheck = function()
   {
      this.dialog.solverCfg.catalogMode = CatalogMode.prototype.Automatic;
      this.dialog.updateCatalogSelectionControls();
   };

   this.automaticCatalog_Sizer = new HorizontalSizer;
   this.automaticCatalog_Sizer.addUnscaledSpacing( labelWidth1 + this.logicalPixelsToPhysical( 4 ) );
   this.automaticCatalog_Sizer.add( this.automaticCatalog_RadioButton );
   this.automaticCatalog_Sizer.addStretch();

   //

   this.localXPSDCatalog_RadioButton = new RadioButton( this );
   this.localXPSDCatalog_RadioButton.text = "Local XPSD server:";
   this.localXPSDCatalog_RadioButton.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   this.localXPSDCatalog_RadioButton.setMinWidth( labelWidth1 );
   this.localXPSDCatalog_RadioButton.checked = this.solverCfg.catalogMode == CatalogMode.prototype.LocalXPSDServer;
   this.localXPSDCatalog_RadioButton.toolTip = "<p>Use a local XPSD catalog server.</p>" +
      "<p>The script supports local database files in XPSD (eXtensible Point Source Database) format.</p>";
   this.localXPSDCatalog_RadioButton.onCheck = function()
   {
      this.dialog.solverCfg.catalogMode = CatalogMode.prototype.LocalXPSDServer;
      this.dialog.localXPSDCatalog_ComboBox.onItemSelected();
      this.dialog.updateCatalogSelectionControls();
   };

   this.localXPSDCatalogButton_Sizer = new HorizontalSizer;
   this.localXPSDCatalogButton_Sizer.addUnscaledSpacing( labelWidth1 + this.logicalPixelsToPhysical( 4 ) );
   this.localXPSDCatalogButton_Sizer.add( this.localXPSDCatalog_RadioButton );
   this.localXPSDCatalogButton_Sizer.addStretch();

   //