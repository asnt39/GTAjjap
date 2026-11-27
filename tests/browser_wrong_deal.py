"""Verify that parking the motorcycle at Quay Transfer advances the first mission."""

import json
import math
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


dist = Path(__file__).resolve().parents[1] / "dist"
if not (dist / "index.html").is_file():
    raise SystemExit("Run npm run build before running this browser test.")

position = {
    "x": 14.34, "y": 0.008, "z": -37.25,
    "yaw": math.pi / 2, "face": math.pi / 2, "pitch": 0.15, "distance": 4.25,
    "vehicles": {"breakwater-650": {"x": 14.5, "z": -36, "heading": math.pi / 2}},
}
story = {"version": 1, "index": 0, "wrongDeal": {"mission": 0, "step": 0, "status": "active"}}

with ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(dist))) as server:
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                executable_path=os.environ.get("CHROMIUM_EXECUTABLE"),
                args=["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--disable-dev-shm-usage"],
            )
            page = browser.new_page(viewport={"width": 540, "height": 338}, service_workers="block")
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.add_init_script(f"""
                localStorage.setItem('harborline.graphicsQuality.v1', 'low');
                localStorage.setItem('harborline.lastPosition.v1', JSON.stringify({json.dumps(position)}));
                localStorage.setItem('harborline.episode.v1', JSON.stringify({json.dumps(story)}));
            """)
            page.goto(f"http://127.0.0.1:{server.server_port}/", wait_until="domcontentloaded")
            page.locator("#intro-skip").dispatch_event("click")
            page.locator("[data-interaction=car-breakwater-650]").click(timeout=120_000)
            page.wait_for_function("document.body.classList.contains('driving')", timeout=45_000)
            print("Mounted the Breakwater 650 at Quay Transfer", flush=True)
            page.wait_for_function("""
                JSON.parse(localStorage.getItem('harborline.episode.v1')).wrongDeal.step === 1
            """, timeout=15_000)
            assert not errors, errors
            print("Quay Transfer accepted the motorcycle and saved the next objective", flush=True)
            browser.close()
    finally:
        server.shutdown()
