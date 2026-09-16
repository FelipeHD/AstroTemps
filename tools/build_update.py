#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import hashlib
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "AstroTemps_AutoProcessing_Tool.js"
UPDATES = ROOT / "updates"
VERSION = "1.2.0"
ZIP_NAME = f"AstroTemps-v{VERSION}.zip"
RELEASE_DATE = "20260916"


def build_zip() -> Path:
    UPDATES.mkdir(parents=True, exist_ok=True)
    out = UPDATES / ZIP_NAME
    arcname = "src/scripts/AstroTemps/AstroTemps_AutoProcessing_Tool.js"
    info = zipfile.ZipInfo(arcname)
    info.date_time = (2026, 9, 16, 12, 0, 0)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    data = SOURCE.read_bytes()
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        zf.writestr(info, data)
    return out


def build_xri(zip_path: Path) -> Path:
    sha1 = hashlib.sha1(zip_path.read_bytes()).hexdigest()
    xri = f'''<?xml version="1.0" encoding="UTF-8"?>
<xri version="1.0">
   <description>
      <p>AstroTemps AutoProcessing Tool repository by Felipe Temponi.</p>
   </description>
   <platform os="all" arch="noarch" version="1.9.4:1.9.99">
      <package fileName="{ZIP_NAME}" sha1="{sha1}" type="script" releaseDate="{RELEASE_DATE}">
         <title>AstroTemps AutoProcessing Tool v{VERSION}</title>
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
    zip_path = build_zip()
    xri_path = build_xri(zip_path)
    print(zip_path)
    print(xri_path)
    print("sha1:", hashlib.sha1(zip_path.read_bytes()).hexdigest())
