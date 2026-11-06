#!/usr/bin/env python3
import sys
import json
import urllib.request
from http.server import SimpleHTTPRequestHandler, HTTPServer

PIHOLE_HOST = "http://192.168.1.253"
PIHOLE_TOKEN = "chVJ0cTJowo/2vbGO/+XdP8B912LmSP+q7K2+Wj0eTQ="
PORT = 8080

class CyberShieldHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, sid")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/pihole/"):
            subpath = self.path[len("/api/pihole"):]
            target_url = f"{PIHOLE_HOST}{subpath}"
            try:
                headers = {
                    "User-Agent": "CyberShield-Dashboard",
                    "Accept": "application/json"
                }
                if PIHOLE_TOKEN:
                    headers["sid"] = PIHOLE_TOKEN
                req = urllib.request.Request(target_url, headers=headers)
                with urllib.request.urlopen(req, timeout=4) as resp:
                    data = resp.read()
                    self.send_response(resp.status)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(data)
            except Exception as e:
                self.send_response(502)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return
        super().do_GET()

if __name__ == "__main__":
    server_address = ("0.0.0.0", PORT)
    httpd = HTTPServer(server_address, CyberShieldHandler)
    print(f"CyberShield server with Pi-hole proxy running on port {PORT}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
