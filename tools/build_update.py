#!/usr/bin/env python3
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import hashlib
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "AstroTemps_AutoProcessing_Tool.js"
VERSION_FILE = ROOT / "VERSION"
UPDATES = ROOT / "updates"


def read_version() -> str:
    if not VERSION_FILE.exists():
        raise SystemExit(f"Missing version file: {VERSION_FILE}")
    version = VERSION_FILE.read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise SystemExit(f"Invalid VERSION value: {version!r}. Expected X.Y.Z")
    return version


def validate_script_version(version: str) -> None:
    text = SOURCE.read_text(encoding="utf-8", errors="strict")
    match = re.search(r'\bvar\s+VERSION\s*=\s*["\']([^"\']+)["\']\s*;', text)
    if not match:
        raise SystemExit("Could not find 'var VERSION = \"X.Y.Z\";' in the script.")
    script_version = match.group(1)
    if script_version != version:
        raise SystemExit(
            f"Version mismatch: VERSION file is {version}, but script declares {script_version}."
        )


def release_date_for(version: str) -> str:
    xri_path = UPDATES / "updates.xri"
    if xri_path.exists():
        text = xri_path.read_text(encoding="utf-8", errors="ignore")
        version_match = re.search(r"AstroTemps-v(\d+\.\d+\.\d+)\.zip", text)
        date_match = re.search(r'releaseDate="(\d{8})"', text)
        if version_match and date_match and version_match.group(1) == version:
            return date_match.group(1)
    return datetime.now(timezone.utc).strftime("%Y%m%d")


def build_zip(version: str, release_date: str) -> Path:
    UPDATES.mkdir(parents=True, exist_ok=True)
    zip_name = f"AstroTemps-v{version}.zip"
    out = UPDATES / zip_name

    for stale in UPDATES.glob("AstroTemps-v*.zip"):
        if stale.name != zip_name:
            stale.unlink()

    arcname = "src/scripts/AstroTemps/AstroTemps_AutoProcessing_Tool.js"
    info = zipfile.ZipInfo(arcname)
    dt = datetime.strptime(release_date, "%Y%m%d")
    info.date_time = (dt.year, dt.month, dt.day, 12, 0, 0)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    data = SOURCE.read_bytes()
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        zf.writestr(info, data)
    return out


def build_xri(zip_path: Path, version: str, release_date: str) -> Path:
    sha1 = hashlib.sha1(zip_path.read_bytes()).hexdigest()
    xri = f'''<?xml version="1.0" encoding="UTF-8"?>
<xri version="1.0">
   <description>
      <p>AstroTemps AutoProcessing Tool repository by Felipe Temponi.</p>
   </description>
   <platform os="all" arch="noarch" version="1.9.4:1.9.99">
      <package fileName="{zip_path.name}" sha1="{sha1}" type="script" releaseDate="{release_date}">
         <title>AstroTemps AutoProcessing Tool v{version}</title>
         <description>
            <p>Automated and configurable astrophotography processing workflow for PixInsight.</p>
         </description>
      </package>
   </platform>
</xri>
'''
    out = UPDATES / "updates.xri"
    out.write_text(xri, encoding="utf-8", newline="\n")
    return out


if __name__ == "__main__":
    if not SOURCE.exists():
        raise SystemExit(f"Missing source file: {SOURCE}")

    version = read_version()
    validate_script_version(version)
    release_date = release_date_for(version)
    zip_path = build_zip(version, release_date)
    xri_path = build_xri(zip_path, version, release_date)

    print("version:", version)
    print("releaseDate:", release_date)
    print(zip_path)
    print(xri_path)
    print("sha1:", hashlib.sha1(zip_path.read_bytes()).hexdigest())
