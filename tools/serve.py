#!/usr/bin/env python3
"""Local test server for the advent game that never lets the browser cache files.

Run from the repository folder:  python3 tools/serve.py
Then open http://localhost:8765/advent/?kid=daria  (or ?kid=seva, add &parent=1 for parent mode).
"""
import functools
import http.server
import os

PORT = 8765
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"Serving {ROOT} at http://localhost:{PORT}/advent/  (Ctrl+C to stop)")
        httpd.serve_forever()
