"""Scan outfits/ and write manifest.json. Run from fitmirror folder: py generate_manifest.py"""

import json
import re
from pathlib import Path

FITMIRROR_ROOT = Path(__file__).resolve().parent
OUTFITS_DIR = FITMIRROR_ROOT / "outfits"
MANIFEST_PATH = OUTFITS_DIR / "manifest.json"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
SKIP_FILENAMES = {"manifest.json", "readme.txt", ".gitkeep"}


def name_from_filename(filename: str) -> str:
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
            {"name": name_from_filename(path.name), "src": f"outfits/{path.name}"}
        )
    return items


def main() -> None:
    items = scan_outfit_files()
    OUTFITS_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(items, indent=2), encoding="utf-8")
    print(f"Wrote {len(items)} outfit(s) to {MANIFEST_PATH}")
    for item in items:
        print(f"  - {item['name']}: {item['src']}")


if __name__ == "__main__":
    main()
