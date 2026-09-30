# A local server for test-slow.js: serves the folder that holds morning-quote on port 8766,
# with no browser caching, and answers every request 8 seconds late while the flag file exists.
import http.server, os, sys, time
FLAG = sys.argv[1]
class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def do_GET(self):
        if os.path.exists(FLAG):
            time.sleep(8)
        super().do_GET()
    def log_message(self, *args):
        pass
http.server.ThreadingHTTPServer(("", 8766), Handler).serve_forever()
