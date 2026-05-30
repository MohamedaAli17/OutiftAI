"""
Minimal FitMirror backend: outfit folder scanner + (later) Gemini proxy.
"""

import json
import re
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

FITMIRROR_ROOT = Path(__file__).resolve().parent.parent
OUTFITS_DIR = FITMIRROR_ROOT / "outfits"
MANIFEST_PATH = OUTFITS_DIR / "manifest.json"

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
SKIP_FILENAMES = {"manifest.json", "readme.txt", ".gitkeep"}

app = FastAPI(title="FitMirror API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def name_from_filename(filename: str) -> str:
    """Turn 'cool_hoodie-v2.png' into 'Cool Hoodie V2'."""
    stem = Path(filename).stem
    words = re.split(r"[-_\s]+", stem)
    return " ".join(word.capitalize() for word in words if word)


def scan_outfit_files() -> list[dict[str, str]]:
    if not OUTFITS_DIR.is_dir():
        return []

    items = []
    for path in sorted(OUTFITS_DIR.iterdir()):
        if not path.is_file():
            continue
        if path.name.lower() in SKIP_FILENAMES or path.name.startswith("."):
            continue
        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        items.append(
            {
                "name": name_from_filename(path.name),
                "src": f"outfits/{path.name}",
            }
        )
    return items


def write_manifest(items: list[dict[str, str]]) -> None:
    OUTFITS_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(items, indent=2), encoding="utf-8")


@app.get("/outfits")
def list_outfits():
    """List image files in outfits/ and refresh manifest.json for static hosting."""
    items = scan_outfit_files()
    write_manifest(items)
    print(f"[outfits] Found {len(items)} outfit(s)")
    return items


@app.get("/health")
def health():
    return {"status": "ok"}
