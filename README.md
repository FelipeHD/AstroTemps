# AstroTemps — macOS release channel

This branch is the dedicated production/update channel for the macOS build of AstroTemps.

## PixInsight repository URL

In PixInsight 1.9.4, open:

`Resources > Updates > Manage Repositories > Add`

Add:

`https://raw.githubusercontent.com/FelipeHD/AstroTemps/pixinsight-update-repository-macos/updates/`

Then run:

`Resources > Updates > Check for Updates`

Install the AstroTemps package and restart PixInsight if requested.

## Included scripts

- AstroTemps AutoProcessing Tool
- AstroTemps Redux

## Compatibility

- macOS
- PixInsight 1.9.4
- Current release: v1.3.1

The macOS release is maintained separately from the Windows production channel. Platform-specific changes in this branch do not modify the Windows release branch or its update repository.

The initial macOS adaptation has been statically audited, but it has not yet been validated across every real Mac / third-party process combination. Third-party modules and external applications must provide their own PixInsight 1.9.4-compatible macOS builds.

## Windows release channel

Windows users should continue using:

`https://raw.githubusercontent.com/FelipeHD/AstroTemps/pixinsight-update-repository/updates/`
