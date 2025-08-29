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
    print("Note: 'Broken pipe' errors are normal and can be ignored.")
    print("They occur when the browser cancels requests.")
    print("")
    
    # Change to script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Try to open browser after a short delay
    def open_browser():
        time.sleep(1)
        try:
            webbrowser.open(f'http://localhost:{port}')
        except:
            # Ignore browser opening errors (e.g., in WSL)
            pass
    
    # Start browser in background
    import threading
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    # Allow socket reuse to prevent "Address already in use" errors
    socketserver.TCPServer.allow_reuse_address = True
    
    # Start server
    try:
        with socketserver.TCPServer(("", port), SimpleHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
    except:
        # Python 2 compatibility
        try:
            httpd = HTTPServer(("", port), SimpleHTTPRequestHandler)
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)

if __name__ == "__main__":
    main()