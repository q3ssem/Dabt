"""Serve the app locally using Python's standard library."""
import functools
import http.server
from pathlib import Path
import socketserver

if __name__ == '__main__':
    folder = Path(__file__).resolve().parent
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(folder))
    class Server(socketserver.TCPServer):
        allow_reuse_address = True
    with Server(('127.0.0.1', 8080), handler) as server:
        print('مختبر العقل: http://localhost:8080  (Ctrl+C to stop)', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
