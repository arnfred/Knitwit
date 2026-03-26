# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Knitwit

Knitwit is an open-source knitting pattern generator web app. Users upload an image, select colors, adjust gauge, crop, and generate a knitting pattern. Patterns can be saved and shared via unique URLs.

## Running Locally

```bash
mise run dev
```

Uses mise for tooling (Python, uv) and uv for dependency management. Dependencies are defined in `pyproject.toml` with a lockfile in `uv.lock`. The app uses Python 3 with Flask as the web framework.

## Dependencies

- **Flask** - web framework (routes, Jinja2 templates)
- **Wand** (ImageMagick bindings) - image loading, cropping, resizing, format conversion
- **Pillow** - pixel data extraction from images
- **NumPy** - array operations for color distance calculations and posterization

Wand requires ImageMagick to be installed on the system (`brew install imagemagick` on macOS).

## Architecture

**Backend (Python):**
- `server.py` — Flask application with all HTTP routes. Handles image upload (file, URL, base64 photo), pattern generation, save/load of patterns, and file cleanup. Uploaded images go to `static/data/uploads/`, saved patterns to `static/data/pages/` as JSON.
- `pattern.py` — Core pattern generation logic. Opens an image via Wand, crops/resizes based on gauge, converts pixel data to NumPy arrays via Pillow, then posterizes to the user's chosen colors using CIE76 color distance in CIELAB space.
- `colorconv.py` — Color space conversion functions (RGB↔LAB, RGB↔XYZ, etc.), extracted from scikit-image with scipy dependency removed.

**Frontend (JavaScript, AMD via curl.js):**
- `static/js/controller.js` — Main entry point, initializes the app
- `static/js/upload.js` — Image upload UI (file upload, URL, camera capture)
- `static/js/colors.js` — Color picker interface
- `static/js/pattern.js` — Pattern display and generation
- `static/js/capture.js` — Camera/webcam capture
- `static/js/page.js` — Saved pattern page display
- Uses Ractive.js for templating (templates in `static/templates/`)
- Server-side templates (Jinja2) in `templates/`

## Deployment

Deployed via Dokku. The `Procfile` runs `python server.py ${PORT}`. The `static/data/` directory is mounted from the host via `dokku storage:mount` to persist uploaded images and saved patterns across deploys.
