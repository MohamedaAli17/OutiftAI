"""
FitMirror backend: live outfit folder scan + static app hosting on port 8000.
"""

import json
import re
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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


def name_from_filename(filename: str, index: int = 0) -> str:
    """Human label from filename; shorten awkward auto-download names."""
    stem = Path(filename).stem
    if len(stem) > 36 or re.search(r"^[A-Za-z0-9+/=_-]{40,}$", stem):
        return f"Outfit {index + 1}"
    words = re.split(r"[-_\s]+", stem)
    label = " ".join(word.capitalize() for word in words if word)
    return label if label else f"Outfit {index + 1}"


def scan_outfit_files() -> list[dict[str, str]]:
    if not OUTFITS_DIR.is_dir():
        return []

    items = []
    index = 0
    for path in sorted(OUTFITS_DIR.iterdir()):
        if not path.is_file():
            continue
        if path.name.lower() in SKIP_FILENAMES or path.name.startswith("."):
            continue
        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        items.append(
            {
                "name": name_from_filename(path.name, index),
                "src": f"outfits/{path.name}",
            }
        )
        index += 1
    return items


def write_manifest(items: list[dict[str, str]]) -> None:
    OUTFITS_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(items, indent=2), encoding="utf-8")


@app.get("/api/outfits")
def list_outfits():
    """Scan outfits/ on every request — always up to date."""
    items = scan_outfit_files()
    write_manifest(items)
    print(f"[outfits] Found {len(items)} outfit(s)")
    return items


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve the whole FitMirror app (index.html, JS, outfit images) from one server.
app.mount(
    "/",
    StaticFiles(directory=str(FITMIRROR_ROOT), html=True),
    name="fitmirror_app",
)
