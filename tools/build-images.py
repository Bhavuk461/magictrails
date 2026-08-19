#!/usr/bin/env python3
"""
Generate responsive WebP derivatives for MagicTrails.

Reads the source photos that live beside the trek folders and writes resized
copies into img/<slug>/<stem>-<width>.webp. Originals are never modified and
images are never upscaled, so a small source simply produces fewer variants.

Usage:  python tools/build-images.py [--force]
"""

import json
import os
import re
import sys
import unicodedata

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_ROOT = os.path.join(ROOT, "img")

# Photos that render inside a content column never need more than 1440px.
CONTENT_WIDTHS = [480, 960, 1440]
# Full-bleed backdrops (trek hero, slider frames, homepage hero) get one more step.
FULLBLEED_WIDTHS = [480, 960, 1440, 1920]

# Full-bleed plates are stretched edge to edge, so they carry a little more
# quality; content photos sit in a column and compress harder without showing it.
QUALITY_FULLBLEED = 80
QUALITY_CONTENT = 72
METHOD = 6  # slowest / best WebP encoder effort

# Sources are discovered from the same folder names data.js uses.
TREK_FOLDERS = [
    "Chandrashila Tungnath",
    "Buran ghati",
    "Roopkund trek",
    "Kuari pass trek",
]
ROOT_IMAGES = ["hero.webp"]

FULLBLEED_STEMS = {"back", "title", "hero"}


def slugify(name):
    """'Buran ghati' -> 'buran-ghati'. Keeps output paths URL-safe."""
    norm = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", norm.lower()).strip("-")


def variant_name(stem, width):
    return "%s-%d.webp" % (slugify(stem), width)


def widths_for(stem):
    return FULLBLEED_WIDTHS if stem in FULLBLEED_STEMS else CONTENT_WIDTHS


def quality_for(stem):
    return QUALITY_FULLBLEED if stem in FULLBLEED_STEMS else QUALITY_CONTENT


def build_one(src, out_dir, force=False):
    """Resize one source into every width it can support. Returns manifest entry."""
    stem = os.path.splitext(os.path.basename(src))[0]
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)  # honour phone orientation tags
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGB")
        src_w, src_h = im.size
        ratio = src_h / src_w

        quality = quality_for(stem)
        made = []
        for w in widths_for(stem):
            if w > src_w:
                continue  # never upscale
            out_path = os.path.join(out_dir, variant_name(stem, w))
            made.append(w)
            if os.path.exists(out_path) and not force:
                continue
            h = max(1, round(w * ratio))
            im.resize((w, h), Image.LANCZOS).save(
                out_path, "WEBP", quality=quality, method=METHOD
            )

        # A source smaller than the narrowest step still needs one usable variant.
        if not made:
            out_path = os.path.join(out_dir, variant_name(stem, src_w))
            made.append(src_w)
            if not os.path.exists(out_path) or force:
                im.save(out_path, "WEBP", quality=quality, method=METHOD)

    return {
        "w": src_w,
        "h": src_h,
        "dir": "img/" + os.path.relpath(out_dir, OUT_ROOT).replace(os.sep, "/"),
        "stem": slugify(stem),
        "widths": sorted(made),
    }


def main():
    force = "--force" in sys.argv
    manifest = {}
    total_src = total_out = 0

    jobs = [(f, os.path.join(ROOT, f)) for f in TREK_FOLDERS]
    jobs.append((None, ROOT))  # root-level images (hero.webp)

    for folder, abs_dir in jobs:
        if folder is None:
            sources = [os.path.join(abs_dir, n) for n in ROOT_IMAGES]
            out_dir = OUT_ROOT
            key_prefix = ""
        else:
            if not os.path.isdir(abs_dir):
                print("  skip (missing folder): %s" % folder)
                continue
            sources = [
                os.path.join(abs_dir, n)
                for n in sorted(os.listdir(abs_dir))
                if n.lower().endswith((".webp", ".jpg", ".jpeg", ".png"))
            ]
            out_dir = os.path.join(OUT_ROOT, slugify(folder))
            key_prefix = folder + "/"

        os.makedirs(out_dir, exist_ok=True)

        for src in sources:
            if not os.path.exists(src):
                print("  skip (missing file): %s" % src)
                continue
            info = build_one(src, out_dir, force)
            key = key_prefix + os.path.basename(src)
            manifest[key] = info
            total_src += os.path.getsize(src)
            print(
                "  %-58s %sx%s -> %s"
                % (
                    key,
                    info["w"],
                    info["h"],
                    ",".join(str(x) for x in info["widths"]),
                )
            )

    for dirpath, _dirs, files in os.walk(OUT_ROOT):
        for f in files:
            if f.endswith(".webp"):
                total_out += os.path.getsize(os.path.join(dirpath, f))

    for entry in manifest.values():
        if entry["dir"] == "img/.":
            entry["dir"] = "img"

    manifest_path = os.path.join(OUT_ROOT, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=1, sort_keys=True)

    # Same data as a plain script tag, so pages need no fetch() to build srcsets.
    js_path = os.path.join(ROOT, "img-manifest.js")
    with open(js_path, "w", encoding="utf-8") as fh:
        fh.write("/* Generated by tools/build-images.py - do not edit by hand. */\n")
        fh.write("window.MT_IMAGES = ")
        json.dump(manifest, fh, indent=1, sort_keys=True)
        fh.write(";\n")

    print(
        "\n%d sources (%.1f MB) -> derivatives (%.1f MB) in img/"
        % (len(manifest), total_src / 1e6, total_out / 1e6)
    )
    print("manifest: %s  +  img-manifest.js" % os.path.relpath(manifest_path, ROOT))


if __name__ == "__main__":
    main()
