#!/usr/bin/env python3
"""
OnlyWorlds Tool - Universal Launcher
Works with Python 2 or 3
"""

import sys
import os
import webbrowser
import time

try:
    # Python 3
    from http.server import HTTPServer, SimpleHTTPRequestHandler
    import socketserver
except ImportError:
    # Python 2
    import SimpleHTTPServer
    import SocketServer as socketserver
    HTTPServer = socketserver.TCPServer
    SimpleHTTPRequestHandler = SimpleHTTPServer.SimpleHTTPRequestHandler

def main():
    port = 8080
    
    print("")
    print("=" * 40)
    print("     OnlyWorlds Tool Template")
    print("=" * 40)
    print("")
    print(f"Starting server at http://localhost:{port}")
    print("Press Ctrl+C to stop")
    print("")
    
    # Change to script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Try to open browser after a short delay
    def open_browser():
        time.sleep(1)
        webbrowser.open(f'http://localhost:{port}')
    
    # Start browser in background
    import threading
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    # Start server
    try:
        with socketserver.TCPServer(("", port), SimpleHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except:
        # Python 2 compatibility
        httpd = HTTPServer(("", port), SimpleHTTPRequestHandler)
        httpd.serve_forever()

if __name__ == "__main__":
    main()