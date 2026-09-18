#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import hashlib
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION_FILE = ROOT / "VERSION"
UPDATES = ROOT / "updates"

SOURCES = [
    (
        ROOT / "AstroTemps_AutoProcessing_Tool.js",
        "src/scripts/AstroTemps/AstroTemps_AutoProcessing_Tool.js",
        r'\bvar\s+VERSION\s*=\s*["\']([^"\']+)["\']\s*;',
        "VERSION",
    ),
    (
        ROOT / "AstroTemps_Redux.js",
        "src/scripts/AstroTemps/AstroTemps_Redux.js",
        r'\bvar\s+REDUX_VERSION\s*=\s*["\']([^"\']+)["\']\s*;',
        "REDUX_VERSION",
    ),
]


def read_version() -> str:
    if not VERSION_FILE.exists():
        raise SystemExit(f"Missing version file: {VERSION_FILE}")
    version = VERSION_FILE.read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise SystemExit(f"Invalid VERSION value: {version!r}. Expected X.Y.Z")
    return version


def validate_sources(version: str) -> None:
    for source, _arcname, pattern, variable_name in SOURCES:
        if not source.exists():
            raise SystemExit(f"Missing source file: {source}")

        text = source.read_text(encoding="utf-8", errors="strict")
        match = re.search(pattern, text)
        if not match:
            raise SystemExit(
                f"Could not find 'var {variable_name} = \"X.Y.Z\";' in {source.name}."
            )

        script_version = match.group(1)
        if script_version != version:
            raise SystemExit(
                f"Version mismatch: VERSION file is {version}, but {source.name} "
                f"declares {script_version}."
            )


def release_date_for(version: str) -> str:
    xri_path = UPDATES / "updates.xri"
    if xri_path.exists():
        text = xri_path.read_text(encoding="utf-8", errors="ignore")
        version_match = re.search(r"AstroTemps-macOS-v(\d+\.\d+\.\d+)\.zip", text)
        date_match = re.search(r'releaseDate="(\d{8})"', text)
        if version_match and date_match and version_match.group(1) == version:
            return date_match.group(1)
    return datetime.now(timezone.utc).strftime("%Y%m%d")


def zip_info_for(arcname: str, release_date: str) -> zipfile.ZipInfo:
    info = zipfile.ZipInfo(arcname)
    dt = datetime.strptime(release_date, "%Y%m%d")
    info.date_time = (dt.year, dt.month, dt.day, 12, 0, 0)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    return info


def build_zip(version: str, release_date: str) -> Path:
    UPDATES.mkdir(parents=True, exist_ok=True)
    zip_name = f"AstroTemps-macOS-v{version}.zip"
    out = UPDATES / zip_name

    # This branch is a dedicated macOS channel. Remove inherited/stale
    # AstroTemps packages from both the Windows and macOS naming schemes.
    for pattern in ("AstroTemps-v*.zip", "AstroTemps-macOS-v*.zip"):
        for stale in UPDATES.glob(pattern):
            if stale.name != zip_name:
                stale.unlink()

    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for source, arcname, _pattern, _variable_name in SOURCES:
            zf.writestr(zip_info_for(arcname, release_date), source.read_bytes())

    return out


def build_xri(zip_path: Path, version: str, release_date: str) -> Path:
    sha1 = hashlib.sha1(zip_path.read_bytes()).hexdigest()
    xri = f'''<?xml version="1.0" encoding="UTF-8"?>
<xri version="1.0">
   <description>
      <p>AstroTemps AutoProcessing Tool macOS repository by Felipe Temponi.</p>
   </description>
   <platform os="all" arch="noarch" version="1.9.4:1.9.99">
      <package fileName="{zip_path.name}" sha1="{sha1}" type="script" releaseDate="{release_date}">
         <title>AstroTemps AutoProcessing Tool v{version} - macOS</title>
         <description>
            <p>macOS build of AstroTemps AutoProcessing Tool and AstroTemps Redux for PixInsight 1.9.4.</p>
         </description>
      </package>
   </platform>
</xri>
'''
    out = UPDATES / "updates.xri"
    out.write_text(xri, encoding="utf-8", newline="\n")
    return out


if __name__ == "__main__":
    version = read_version()
    validate_sources(version)
    release_date = release_date_for(version)
    zip_path = build_zip(version, release_date)
    xri_path = build_xri(zip_path, version, release_date)

    print("version:", version)
    print("releaseDate:", release_date)
    print(zip_path)
    print(xri_path)
    print("sha1:", hashlib.sha1(zip_path.read_bytes()).hexdigest())
