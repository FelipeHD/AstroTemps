# AstroTemps — macOS development

This branch contains the macOS adaptation of AstroTemps AutoProcessing Tool and AstroTemps Redux.

## Target

- macOS
- PixInsight 1.9.4
- AstroTemps v1.3.5

## Development policy

macOS development is isolated from the Windows release branches so platform-specific fixes can be tested without changing the Windows production build.

The current macOS adaptation includes:

- PixInsight-relative ImageSolver support paths.
- macOS application-bundle resolution for SetiAstroSuitePro / Cosmic Clarity.
- macOS application-bundle resolution for GraXpert.
- macOS-specific executable discovery and `python3` handling.
- macOS host guards in the Complete and Redux scripts.

## Production channel

Validated macOS releases are published from:

`pixinsight-update-repository-macos`

Repository URL for PixInsight:

`https://raw.githubusercontent.com/FelipeHD/AstroTemps/pixinsight-update-repository-macos/updates/`

> Initial macOS builds are not yet validated on every Mac / third-party process combination. Third-party modules must provide their own PixInsight 1.9.4-compatible macOS builds.
