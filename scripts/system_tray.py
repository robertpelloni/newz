#!/usr/bin/env python3
"""
Omnifeed / Newz Cross-Platform System Tray & Lifecycle CLI.
Provides service status, background ingestion triggering, web dashboard launcher,
and clean server shutdown management.
"""

import sys
import os
import argparse
import webbrowser
import requests
import subprocess
import time

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

def get_system_status():
    """Query backend API health and status."""
    try:
        resp = requests.get(f"{BACKEND_URL}/api/system/status", timeout=3)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return None

def trigger_sync():
    """Trigger on-demand background sync."""
    try:
        print("[Omnifeed Tray] Triggering on-demand ingestion...")
        resp = requests.post(f"{BACKEND_URL}/api/actions/sync", timeout=15)
        if resp.status_code == 200:
            print(f"[Omnifeed Tray] Sync complete: {resp.json()}")
            return True
    except Exception as e:
        print(f"[Omnifeed Tray] Sync error: {e}")
    return False

def open_dashboard():
    """Launch dashboard in default web browser."""
    print(f"[Omnifeed Tray] Opening dashboard: {FRONTEND_URL}")
    webbrowser.open(FRONTEND_URL)

def stop_services():
    """Gracefully terminate backend and frontend servers."""
    print("[Omnifeed Tray] Requesting graceful backend shutdown...")
    try:
        requests.post(f"{BACKEND_URL}/api/system/shutdown", timeout=3)
    except Exception:
        pass

    # Kill any processes bound to ports 8000 and 3000
    subprocess.run(["fuser", "-k", "8000/tcp"], capture_output=True)
    subprocess.run(["fuser", "-k", "3000/tcp"], capture_output=True)
    print("[Omnifeed Tray] All Omnifeed servers stopped.")

def start_services():
    """Start backend and frontend services in the background."""
    print("[Omnifeed Tray] Starting backend server...")
    backend_proc = subprocess.Popen(
        ["python3", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(2)

    print("[Omnifeed Tray] Starting frontend server...")
    frontend_proc = subprocess.Popen(
        ["npm", "start", "--", "-p", "3000"],
        cwd="frontend",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(2)
    print("[Omnifeed Tray] Services launched successfully.")

def run_tray():
    """CLI / Interactive tray loop."""
    print("=" * 60)
    print("  OMNIFEED // NEWZ SYSTEM TRAY & OPERATIONS MANAGER")
    print("=" * 60)

    status = get_system_status()
    if status:
        print(f"Status: ONLINE (Version {status.get('version')})")
        counts = status.get('counts', {})
        print(f"Articles: {counts.get('articles', 0)} | Topics: {counts.get('topics', 0)} | Discussions: {counts.get('discussions', 0)}")
    else:
        print("Status: OFFLINE (Backend not reachable at http://localhost:8000)")

    print("-" * 60)
    print("Commands:")
    print("  [1] Open Dashboard (Web Browser)")
    print("  [2] Trigger Live Ingestion Sync")
    print("  [3] Start Servers")
    print("  [4] Stop / Quit Servers")
    print("  [5] Exit Tray CLI")
    print("-" * 60)

def main():
    parser = argparse.ArgumentParser(description="Omnifeed System Tray & Process Manager")
    parser.add_argument("--status", action="store_true", help="Print backend system status")
    parser.add_argument("--sync", action="store_true", help="Trigger background ingestion sync")
    parser.add_argument("--open", action="store_true", help="Open frontend dashboard in browser")
    parser.add_argument("--start", action="store_true", help="Start backend and frontend")
    parser.add_argument("--stop", action="store_true", help="Stop backend and frontend")
    parser.add_argument("--daemon", action="store_true", help="Run interactive console tray loop")

    args = parser.parse_args()

    if args.status:
        st = get_system_status()
        print(st if st else "Backend is offline.")
    elif args.sync:
        trigger_sync()
    elif args.open:
        open_dashboard()
    elif args.start:
        start_services()
    elif args.stop:
        stop_services()
    else:
        run_tray()

if __name__ == "__main__":
    main()
